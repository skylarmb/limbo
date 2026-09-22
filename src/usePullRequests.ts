import { useCallback, useEffect, useState } from "react";
import { REFRESH_MS } from "./config";
import { fetchPullRequests, type PullRequest } from "./github";

// Loads PRs on mount, polls every REFRESH_MS, and exposes a manual refresh.
export function usePullRequests() {
	const [prs, setPrs] = useState<PullRequest[]>([]);
	const [error, setError] = useState<string>();
	const [loading, setLoading] = useState(true);

	const refresh = useCallback(async () => {
		setLoading(true);
		try {
			setPrs(await fetchPullRequests());
			setError(undefined);
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		refresh();
		const timer = setInterval(refresh, REFRESH_MS);
		return () => clearInterval(timer);
	}, [refresh]);

	return { prs, error, loading, refresh };
}
