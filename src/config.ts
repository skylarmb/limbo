// Repos to watch. Each is searched with every qualifier in QUERIES.
export const REPOS = ["owner/repo-b"];

// GitHub search qualifiers. GraphQL search has no OR, so each one runs as
// its own aliased search and the results are merged.
export const QUERIES = ["involves:@me", "review-requested:@me"];

// How often to re-fetch PRs.
export const REFRESH_MS = 60_000;
