import { $ } from "bun";
import { REPOS, SECTIONS } from "./config";

export type PullRequest = {
	id: string;
	number: number;
	title: string;
	url: string;
	createdAt: string;
	author: { login: string } | null;
	repository: { nameWithOwner: string };
	isDraft: boolean;
	// UNKNOWN while GitHub computes it lazily.
	mergeable: "MERGEABLE" | "CONFLICTING" | "UNKNOWN";
	// null when the repo has no required reviews.
	reviewDecision: "APPROVED" | "CHANGES_REQUESTED" | "REVIEW_REQUIRED" | null;
	// Combined CI state of the head commit; rollup is null when no checks ran.
	commits: {
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
	const json = (await res.json()) as {
		data?: T;
		errors?: { message: string }[];
	};
	if (json.errors?.length)
		throw new Error(json.errors.map((e) => e.message).join("; "));
	if (!res.ok || !json.data) throw new Error(`GitHub API ${res.status}`);
	return json.data;
}

const PR_FIELDS = `id number title url createdAt author { login } repository { nameWithOwner }
	isDraft mergeable reviewDecision commits(last: 1) { nodes { commit { statusCheckRollup { state } } } }`;

export type Section = { title: string; prs: PullRequest[] };

// Fetch every section × repo search in one request. Each section is deduped
// against the ones above it and sorted newest first.
export async function fetchSections(): Promise<Section[]> {
	if (REPOS.length === 0) throw new Error("LIMBO_REPOS is not set");
	const alias = (i: number, j: number) => `s${i}_${j}`;
	const query = `{ ${SECTIONS.flatMap((section, i) =>
		REPOS.map(
			(repo, j) =>
				`${alias(i, j)}: search(query: ${JSON.stringify(`is:pr is:open repo:${repo} ${section.query}`)}, type: ISSUE, first: 100) { nodes { ... on PullRequest { ${PR_FIELDS} } } }`,
		),
	).join("\n")} }`;

	const data = await graphql<Record<string, { nodes: PullRequest[] }>>(query);
	const seen = new Set<string>();
	return SECTIONS.map(({ title }, i) => {
		const prs = REPOS.flatMap((_, j) => data[alias(i, j)]?.nodes ?? []).filter(
			(pr) => {
				if (seen.has(pr.id)) return false;
				seen.add(pr.id);
				return true;
			},
		);
		prs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
		return { title, prs };
	});
}
