import { $ } from "bun";
import { LIMIT, REPOS, SECTIONS, type SectionConfig } from "./config";
import { statusOf } from "./status";

export type PullRequest = {
	id: string;
	number: number;
	title: string;
	url: string;
	createdAt: string;
	author: { login: string } | null;
	repository: { nameWithOwner: string };
	state: "OPEN" | "CLOSED" | "MERGED";
	// The fields below are fetched only for open PRs (OPEN_FIELDS). Closed PRs
	// do not use them, and reviewDecision and commits are slow to resolve.
	isDraft?: boolean;
	// UNKNOWN while GitHub computes it lazily.
	mergeable?: "MERGEABLE" | "CONFLICTING" | "UNKNOWN";
	// null when the repo has no required reviews.
	reviewDecision?: "APPROVED" | "CHANGES_REQUESTED" | "REVIEW_REQUIRED" | null;
	// Combined CI state of the head commit; rollup is null when no checks ran.
	commits?: {
		nodes: { commit: { statusCheckRollup: { state: string } | null } }[];
	};
};

// Prefer GITHUB_TOKEN, else borrow the gh CLI's token.
let token: string | undefined;
async function getToken(): Promise<string> {
	token ??= process.env.GITHUB_TOKEN ?? (await $`gh auth token`.text()).trim();
	return token;
}

// Minimal GraphQL client over fetch.
async function graphql<T>(query: string): Promise<T> {
	const res = await fetch("https://api.github.com/graphql", {
		method: "POST",
		headers: { Authorization: `bearer ${await getToken()}` },
		body: JSON.stringify({ query }),
	});
	// Check the status first: on a timeout GitHub returns an HTML page, not JSON.
	if (!res.ok) throw new Error(`GitHub API ${res.status}`);
	const json = (await res.json()) as {
		data?: T;
		errors?: { message: string }[];
	};
	if (json.errors?.length)
		throw new Error(json.errors.map((e) => e.message).join("; "));
	if (!json.data) throw new Error("GitHub API returned no data");
	return json.data;
}

const PR_FIELDS = `id number title url createdAt author { login } repository { nameWithOwner } state`;
const OPEN_FIELDS = `isDraft mergeable reviewDecision commits(last: 1) { nodes { commit { statusCheckRollup { state } } } }`;

export type Section = SectionConfig & { prs: PullRequest[] };

// Which PRs to list, as in GitHub's is:open / is:closed. Closed includes merged.
export type PrState = "open" | "closed";

// True if an open PR is outside the section focus, so it sinks and dims.
// Focus is ignored for closed PRs, which have nothing left to act on.
export function unfocused(section: SectionConfig, pr: PullRequest): boolean {
	return (
		pr.state === "OPEN" &&
		section.focus !== undefined &&
		statusOf(pr) !== section.focus
	);
}

// Fetch every section × repo search in one request. Each section is deduped
// against the ones above it and sorted newest first, with unfocused PRs last.
export async function fetchSections(state: PrState): Promise<Section[]> {
	if (REPOS.length === 0) throw new Error("LIMBO_REPOS is not set");
	const alias = (i: number, j: number) => `s${i}_${j}`;
	// Closed PRs only need merged vs closed, so skip the open-only fields.
	const fields = state === "open" ? `${PR_FIELDS} ${OPEN_FIELDS}` : PR_FIELDS;
	const query = `{ ${SECTIONS.flatMap((section, i) =>
		REPOS.map(
			(repo, j) =>
				`${alias(i, j)}: search(query: ${JSON.stringify(`is:pr is:${state} repo:${repo} sort:created-desc ${section.query}`)}, type: ISSUE, first: ${LIMIT}) { nodes { ... on PullRequest { ${fields} } } }`,
		),
	).join("\n")} }`;

	const data = await graphql<Record<string, { nodes: PullRequest[] }>>(query);
	const seen = new Set<string>();
	return SECTIONS.map((section, i) => {
		const prs = REPOS.flatMap((_, j) => data[alias(i, j)]?.nodes ?? []).filter(
			(pr) => {
				if (seen.has(pr.id)) return false;
				seen.add(pr.id);
				return true;
			},
		);
		prs.sort(
			(a, b) =>
				Number(unfocused(section, a)) - Number(unfocused(section, b)) ||
				b.createdAt.localeCompare(a.createdAt),
		);
		return { ...section, prs: prs.slice(0, LIMIT) };
	});
}
