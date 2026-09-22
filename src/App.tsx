import { Box, Text, useApp, useInput, useWindowSize } from "ink";
import { useRef, useState } from "react";
import { type PrState, type PullRequest, unfocused } from "./github";
import { type Status, statusOf } from "./status";
import { useSections } from "./useSections";

// One terminal line. Rows are truncated so each line is exactly one row tall,
// which keeps the scroll math simple.
type Line =
	| { kind: "header"; title: string; count: number }
	| { kind: "pr"; pr: PullRequest; status: Status; muted: boolean };

// Named ANSI colors, so the terminal color scheme decides the actual shades.
// Red means act, green means merge, yellow means wait.
const STATUS_COLOR: Record<Status, string | undefined> = {
	ready: "green",
	"ci failing": "red",
	conflicts: "red",
	"changes requested": "red",
	"ci running": "yellow",
	"awaiting review": "cyan",
	draft: undefined,
	merged: "magenta",
	closed: "gray",
};

export function App() {
	const { exit } = useApp();
	const { rows, columns } = useWindowSize();
	const [state, setState] = useState<PrState>("open");
	const { sections, error, loading, refresh } = useSections(state);
	const [cursor, setCursor] = useState(0);
	const top = useRef(0);
	// Waiting for Enter or q to confirm quitting.
	const [confirmQuit, setConfirmQuit] = useState(false);
	// One-shot footer message, such as "copied <url>". Cleared on the next key.
	const [notice, setNotice] = useState<string>();

	// Empty sections are skipped entirely, header included.
	const lines: Line[] = sections
		.filter((section) => section.prs.length > 0)
		.flatMap((section) => [
			{
				kind: "header" as const,
				// Label the closed view so it cannot be mistaken for open PRs.
				title: state === "closed" ? `${section.title}, closed` : section.title,
				count: section.prs.length,
			},
			...section.prs.map((pr) => {
				const status = statusOf(pr);
				// Drafts and PRs outside the section focus get the lowest priority.
				const muted = status === "draft" || unfocused(section, pr);
				return { kind: "pr" as const, pr, status, muted };
			}),
		]);
	// Line index of each PR, so the cursor can skip headers.
	const prLines = lines.flatMap((line, i) => (line.kind === "pr" ? [i] : []));
	// Size the repo and number columns to their longest value, plus a space.
	const prs = sections.flatMap((section) => section.prs);
	const widths = {
		repo: Math.max(0, ...prs.map((pr) => repoName(pr).length)) + 1,
		number: Math.max(0, ...prs.map((pr) => `#${pr.number}`.length)) + 1,
	};
	// Clamp in case a refresh shrank the list.
	const selected = Math.min(cursor, prLines.length - 1);
	const cursorLine = prLines[selected] ?? 0;

	// Keep total output below the terminal height (one line for the footer),
	// or Ink clears and redraws the whole screen on every render.
	const height = Math.max(rows - 2, 1);
	// Scroll only as far as needed to keep the cursor visible. When moving up
	// to a section's first PR, also reveal its header.
	const reveal =
		lines[cursorLine - 1]?.kind === "header" ? cursorLine - 1 : cursorLine;
	if (reveal < top.current) top.current = reveal;
	if (cursorLine >= top.current + height) top.current = cursorLine - height + 1;

	const current = lines[cursorLine];
	const selectedPr = current?.kind === "pr" ? current.pr : undefined;

	// j/k = move, o = open in browser, y = copy URL, c = toggle open/closed,
	// r = refresh, q = quit (asks to confirm).
	useInput((input, key) => {
		setNotice(undefined);
		// While confirming, Enter or q quits and any other key cancels.
		if (confirmQuit) {
			if (key.return || input === "q") exit();
			setConfirmQuit(false);
			return;
		}
		if (input === "j") setCursor(Math.min(selected + 1, prLines.length - 1));
		if (input === "k") setCursor(Math.max(selected - 1, 0));
		// macOS `open` and `pbcopy`. Other platforms can come later.
		if (input === "o" && selectedPr) Bun.spawn(["open", selectedPr.url]);
		if (input === "y" && selectedPr) {
			Bun.spawn(["pbcopy"], { stdin: new Blob([selectedPr.url]) });
			setNotice(`copied ${selectedPr.url}`);
		}
		if (input === "c") {
			setState(state === "open" ? "closed" : "open");
			setCursor(0);
			top.current = 0;
		}
		if (input === "r") refresh();
		if (input === "q") setConfirmQuit(true);
	});

	// Footer text, highest priority first.
	function footer(): string {
		if (confirmQuit) return "quit? enter or q to confirm";
		if (notice) return notice;
		if (error) return `error: ${error}`;
		if (loading && lines.length === 0) return "loading…";
		return "";
	}

	return (
		<Box flexDirection="column">
			{lines.slice(top.current, top.current + height).map((line, i) =>
				line.kind === "header" ? (
					<Text key={line.title} bold wrap="truncate">
						{`── ${line.title} (${line.count}) `.padEnd(columns, "─")}
					</Text>
				) : (
					<Row
						key={line.pr.id}
						line={line}
						widths={widths}
						selected={top.current + i === cursorLine}
					/>
				),
			)}
			{/* One line at most, so output stays below the terminal height. */}
			<Text wrap="truncate">{footer()}</Text>
		</Box>
	);
}

// Repo name without the owner, to keep the column narrow.
function repoName(pr: PullRequest): string {
	return pr.repository.nameWithOwner.split("/")[1] ?? "";
}

// One PR row: cursor gutter, colored status, repo, #number, then title @author.
// Repo, number, and author are gray so status and title stand out. Muted rows
// are all gray. Gray is ANSI bright black, which terminals render more reliably
// than the dim attribute.
function Row({
	line: { pr, status, muted },
	widths,
	selected,
}: {
	line: Extract<Line, { kind: "pr" }>;
	widths: { repo: number; number: number };
	selected: boolean;
}) {
	return (
		<Box>
			<Box width={2} flexShrink={0}>
				<Text>{selected ? ">" : " "}</Text>
			</Box>
			{/* Fixed width so titles line up; fits the longest status. */}
			<Box width={18} flexShrink={0}>
				<Text color={muted ? "gray" : STATUS_COLOR[status]} bold={selected}>
					{status}
				</Text>
			</Box>
			<Box width={widths.repo} flexShrink={0}>
				<Text color="gray" bold={selected} wrap="truncate">
					{repoName(pr)}
				</Text>
			</Box>
			<Box width={widths.number} flexShrink={0}>
				<Text color="gray" bold={selected}>
					#{pr.number}
				</Text>
			</Box>
			<Text wrap="truncate" color={muted ? "gray" : undefined} bold={selected}>
				{pr.title} <Text color="gray">@{pr.author?.login ?? "ghost"}</Text>
			</Text>
		</Box>
	);
}
