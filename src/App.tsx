import { Box, Text, useApp, useInput, useWindowSize } from "ink";
import { useRef, useState } from "react";
import type { PullRequest } from "./github";
import { statusOf } from "./status";
import { useSections } from "./useSections";

// One terminal line. Rows are truncated so each line is exactly one row tall,
// which keeps the scroll math simple.
type Line =
	| { kind: "header"; title: string; count: number }
	| { kind: "pr"; pr: PullRequest };

export function App() {
	const { exit } = useApp();
	const { rows, columns } = useWindowSize();
	const { sections, error, loading, refresh } = useSections();
	const [cursor, setCursor] = useState(0);
	const top = useRef(0);

	const lines: Line[] = sections.flatMap(({ title, prs }) => [
		{ kind: "header" as const, title, count: prs.length },
		...prs.map((pr) => ({ kind: "pr" as const, pr })),
	]);
	// Line index of each PR, so the cursor can skip headers.
	const prLines = lines.flatMap((line, i) => (line.kind === "pr" ? [i] : []));
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

	// j/k = move, o = open in browser, r = refresh, q = quit.
	useInput((input) => {
		if (input === "j") setCursor(Math.min(selected + 1, prLines.length - 1));
		if (input === "k") setCursor(Math.max(selected - 1, 0));
		if (input === "o") {
			const line = lines[cursorLine];
			// macOS `open`. Other platforms can come later.
			if (line?.kind === "pr") Bun.spawn(["open", line.pr.url]);
		}
		if (input === "r") refresh();
		if (input === "q") exit();
	});

	return (
		<Box flexDirection="column">
			{lines.slice(top.current, top.current + height).map((line, i) =>
				line.kind === "header" ? (
					<Text key={line.title} bold wrap="truncate">
						{`── ${line.title} (${line.count}) `.padEnd(columns, "─")}
					</Text>
				) : (
					<Box key={line.pr.id}>
						{/* Cursor gutter. */}
						<Box width={2} flexShrink={0}>
							<Text>{top.current + i === cursorLine ? ">" : " "}</Text>
						</Box>
						{/* Fixed width so titles line up; fits the longest status. */}
						<Box width={18} flexShrink={0}>
							<Text>{statusOf(line.pr)}</Text>
						</Box>
						<Text wrap="truncate">
							{line.pr.repository.nameWithOwner}#{line.pr.number}{" "}
							{line.pr.title} @{line.pr.author?.login ?? "ghost"}
						</Text>
					</Box>
				),
			)}
			{error && <Text wrap="truncate">error: {error}</Text>}
			{loading && lines.length === 0 && <Text>loading…</Text>}
		</Box>
	);
}
