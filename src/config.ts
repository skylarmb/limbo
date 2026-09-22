import type { Status } from "./status";

// Repos to watch, from LIMBO_REPOS as comma-separated owner/name pairs.
// Each is searched with the qualifier of every section.
export const REPOS = (process.env.LIMBO_REPOS ?? "")
	.split(",")
	.map((repo) => repo.trim())
	.filter(Boolean);

// Dashboard sections, top to bottom. Each runs its search qualifier against
// every repo. GraphQL search has no OR, so each is its own aliased search.
// A PR shows only in the first section that matches it. If `focus` is set,
// PRs with any other status sink to the bottom of the section and are dimmed.
export type SectionConfig = { title: string; query: string; focus?: Status };
export const SECTIONS: SectionConfig[] = [
	{ title: "My PRs", query: "author:@me" },
	{ title: "Involves me", query: "involves:@me" },
	{
		title: "Review requested",
		query: "review-requested:@me",
		focus: "awaiting review",
	},
];

// How often to re-fetch PRs.
export const REFRESH_MS = 60_000;
