// Repos to watch. Each is searched with every qualifier in QUERIES.
export const REPOS = [
	"owner/repo-a",
	"owner/repo-b",
];

// Dashboard sections, top to bottom. Each runs its search qualifier against
// every repo. GraphQL search has no OR, so each is its own aliased search.
// A PR shows only in the first section that matches it.
export const SECTIONS = [
	{ title: "Involves me", query: "involves:@me" },
	{ title: "Review requested", query: "review-requested:@me" },
];

// How often to re-fetch PRs.
export const REFRESH_MS = 60_000;
