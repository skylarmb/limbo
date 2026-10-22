import { render } from "ink";
import { App } from "./App";
import type { PrState, PullRequest, Section } from "./github";

// Static data for screenshots. The repos and authors are examples. The open
// view shows every open status, and the closed view shows merged and closed.

// A PR with only the fields that closed PRs fetch.
function closed(
	repo: string,
	number: number,
	title: string,
	author: string,
	state: "MERGED" | "CLOSED",
): PullRequest {
	return {
		id: `${repo}#${number}`,
		number,
		title,
		url: `https://github.com/example/${repo}/pull/${number}`,
		createdAt: "2026-01-01T00:00:00Z",
		author: { login: author },
		repository: { nameWithOwner: `example/${repo}` },
		state,
	};
}

// An open PR that is ready to merge. Overrides set the fields that statusOf
// reads, so each row gets its status from the real status logic.
function open(
	repo: string,
	number: number,
	title: string,
	author: string,
	overrides: Partial<PullRequest> = {},
): PullRequest {
	return {
		...closed(repo, number, title, author, "MERGED"),
		state: "OPEN",
		isDraft: false,
		mergeable: "MERGEABLE",
		reviewDecision: "APPROVED",
		commits: ci("SUCCESS"),
		...overrides,
	};
}

// The head commit CI rollup, as GitHub returns it.
function ci(state: string): PullRequest["commits"] {
	return { nodes: [{ commit: { statusCheckRollup: { state } } }] };
}

// Each section is in final display order. The demo skips the dedupe and sort
// in fetchSections, so the order here is the order on screen.
const OPEN: Section[] = [
	{
		title: "My PRs",
		query: "author:@me",
		prs: [
			open(
				"api-server",
				2418,
				"Add cursor pagination to the list endpoints",
				"you",
			),
			open(
				"web-app",
				1187,
				"Cache the dashboard queries for 30 seconds",
				"you",
				{
					commits: ci("PENDING"),
				},
			),
			open("cli", 342, "Add a --json flag to the status command", "you", {
				isDraft: true,
			}),
		],
	},
	{
		title: "Involves me",
		query: "involves:@me",
		prs: [
			open(
				"api-server",
				2409,
				"Retry webhook deliveries on 5xx responses",
				"alex",
				{
					reviewDecision: "CHANGES_REQUESTED",
				},
			),
			open(
				"web-app",
				1179,
				"Move the settings page to the new form library",
				"sam",
				{
					commits: ci("FAILURE"),
				},
			),
		],
	},
	{
		title: "Review requested",
		query: "review-requested:@me",
		focus: "awaiting review",
		prs: [
			open("api-server", 2421, "Add an index for audit log queries", "jordan", {
				reviewDecision: "REVIEW_REQUIRED",
			}),
			open(
				"web-app",
				1190,
				"chore(deps): bump the react group across 1 directory with 2 updates",
				"dependabot",
				{ reviewDecision: "REVIEW_REQUIRED" },
			),
			open("docs", 455, "Document the config file format", "taylor", {
				reviewDecision: "REVIEW_REQUIRED",
			}),
			// Not the section focus, so it sinks to the bottom and shows in gray.
			open("cli", 338, "Rename the --repo flag to --repos", "riley", {
				mergeable: "CONFLICTING",
			}),
		],
	},
];

const CLOSED: Section[] = [
	{
		title: "My PRs",
		query: "author:@me",
		prs: [
			closed(
				"api-server",
				2401,
				"Add request IDs to error responses",
				"you",
				"MERGED",
			),
			closed(
				"web-app",
				1170,
				"Try a virtualized list for the PR table",
				"you",
				"CLOSED",
			),
			closed(
				"cli",
				335,
				"Read the token from GITHUB_TOKEN first",
				"you",
				"MERGED",
			),
		],
	},
	{
		title: "Review requested",
		query: "review-requested:@me",
		focus: "awaiting review",
		prs: [
			closed("docs", 450, "Add a troubleshooting page", "taylor", "MERGED"),
		],
	},
];

async function demoSections(state: PrState): Promise<Section[]> {
	return state === "open" ? OPEN : CLOSED;
}

render(<App fetchSections={demoSections} />);
