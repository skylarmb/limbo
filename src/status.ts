import type { PullRequest } from "./github";

export type Status =
	| "draft"
	| "ci failing"
	| "ci running"
	| "conflicts"
	| "changes requested"
	| "awaiting review"
	| "ready";

// Derive one status per PR. The first match wins, so blockers come before "ready".
export function statusOf(pr: PullRequest): Status {
	const ci = pr.commits.nodes[0]?.commit.statusCheckRollup?.state;
	if (pr.isDraft) return "draft";
	if (ci === "FAILURE" || ci === "ERROR") return "ci failing";
	if (ci === "PENDING" || ci === "EXPECTED") return "ci running";
	if (pr.mergeable === "CONFLICTING") return "conflicts";
	if (pr.reviewDecision === "CHANGES_REQUESTED") return "changes requested";
	if (pr.reviewDecision === "REVIEW_REQUIRED") return "awaiting review";
	return "ready";
}
