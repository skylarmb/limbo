import { expect, test } from "bun:test";
import type { PullRequest } from "./github";
import { statusOf } from "./status";

// Build a PR that is ready to merge, with overrides for each case.
function pr(
	overrides: Partial<PullRequest> = {},
	ci: string | null = "SUCCESS",
): PullRequest {
	return {
		id: "1",
		number: 1,
		title: "t",
		url: "u",
		createdAt: "2026-01-01",
		author: null,
		repository: { nameWithOwner: "o/r" },
		state: "OPEN",
		isDraft: false,
		mergeable: "MERGEABLE",
		reviewDecision: "APPROVED",
		commits: {
			nodes: [{ commit: { statusCheckRollup: ci ? { state: ci } : null } }],
		},
		...overrides,
	};
}

test("statusOf", () => {
	expect(statusOf(pr())).toBe("ready");
	expect(statusOf(pr({ state: "MERGED" }, "FAILURE"))).toBe("merged");
	expect(statusOf(pr({ state: "CLOSED", isDraft: true }))).toBe("closed");
	expect(statusOf(pr({}, null))).toBe("ready");
	expect(statusOf(pr({ isDraft: true }, "FAILURE"))).toBe("draft");
	expect(statusOf(pr({}, "FAILURE"))).toBe("ci failing");
	expect(statusOf(pr({}, "PENDING"))).toBe("ci running");
	expect(statusOf(pr({ mergeable: "CONFLICTING" }))).toBe("conflicts");
	expect(statusOf(pr({ reviewDecision: "CHANGES_REQUESTED" }))).toBe(
		"changes requested",
	);
	expect(statusOf(pr({ reviewDecision: "REVIEW_REQUIRED" }))).toBe(
		"awaiting review",
	);
	expect(statusOf(pr({ reviewDecision: null }))).toBe("ready");
});
