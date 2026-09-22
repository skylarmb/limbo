import { useCallback, useEffect, useRef, useState } from "react";
import { REFRESH_MS } from "./config";
import { fetchSections, type PrState, type Section } from "./github";

// Loads sections for the given PR state, polls every REFRESH_MS, and exposes a
// manual refresh. Changing the state fetches again.
export function useSections(state: PrState) {
	// Fetched sections, tagged with the state they belong to.
	const [data, setData] = useState<{ state: PrState; sections: Section[] }>();
	const [error, setError] = useState<string>();
	const [loading, setLoading] = useState(true);
	// Id of the newest request. Older responses are dropped, so a slow fetch
	// for the previous state cannot overwrite the current one.
	const latest = useRef(0);

	const refresh = useCallback(async () => {
		const id = ++latest.current;
		setLoading(true);
		try {
			const next = await fetchSections(state);
			if (id !== latest.current) return;
			setData({ state, sections: next });
			setError(undefined);
		} catch (e) {
			if (id !== latest.current) return;
			setError(e instanceof Error ? e.message : String(e));
		} finally {
			if (id === latest.current) setLoading(false);
		}
	}, [state]);

	useEffect(() => {
		refresh();
		const timer = setInterval(refresh, REFRESH_MS);
		return () => clearInterval(timer);
	}, [refresh]);

	// Return nothing until data for the current state arrives, so the previous
	// state's PRs never show under the new label.
	const sections = data?.state === state ? data.sections : [];
	return { sections, error, loading, refresh };
}
