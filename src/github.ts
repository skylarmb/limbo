import { $ } from "bun";
import { QUERIES, REPOS } from "./config";

export type PullRequest = {
	id: string;
	number: number;
	title: string;
	url: string;
	createdAt: string;
	author: { login: string } | null;
	repository: { nameWithOwner: string };
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

const PR_FIELDS = `id number title url createdAt author { login } repository { nameWithOwner }`;

// Fetch open PRs for every repo × qualifier in one request, deduped and newest first.
export async function fetchPullRequests(): Promise<PullRequest[]> {
	const searches = REPOS.flatMap((repo) =>
		QUERIES.map((q) => `is:pr is:open repo:${repo} ${q}`),
	);
	const query = `{ ${searches
		.map(
			(q, i) =>
				`s${i}: search(query: ${JSON.stringify(q)}, type: ISSUE, first: 100) { nodes { ... on PullRequest { ${PR_FIELDS} } } }`,
		)
		.join("\n")} }`;

	const data = await graphql<Record<string, { nodes: PullRequest[] }>>(query);
	const byId = new Map<string, PullRequest>();
	for (const { nodes } of Object.values(data))
		for (const pr of nodes) byId.set(pr.id, pr);
	return [...byId.values()].sort((a, b) =>
		b.createdAt.localeCompare(a.createdAt),
	);
}
