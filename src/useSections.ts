import { useCallback, useEffect, useRef, useState } from "react";
import { REFRESH_MS } from "./config";
import type { FetchSections, PrState, Section } from "./github";

// Loads sections for the given PR state, polls every REFRESH_MS, and exposes a
// manual refresh. Results are cached per state, so toggling back to a state
// shows its cached sections and fetches only if it never loaded.
// fetchSections is a parameter so the demo can pass static data.
export function useSections(state: PrState, fetchSections: FetchSections) {
	const [cache, setCache] = useState<Partial<Record<PrState, Section[]>>>({});
	const [error, setError] = useState<string>();
	const [loading, setLoading] = useState(true);
	// States with a cached result. A ref, so the effect can check it without
	// re-running on every cache update.
	const loaded = useRef(new Set<PrState>());

	const refresh = useCallback(async () => {
		setLoading(true);
		try {
			const sections = await fetchSections(state);
			// Keyed by state, so a late response only fills its own slot.
			setCache((c) => ({ ...c, [state]: sections }));
			loaded.current.add(state);
			setError(undefined);
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		} finally {
			setLoading(false);
		}
	}, [state, fetchSections]);

	useEffect(() => {
		if (!loaded.current.has(state)) refresh();
		const timer = setInterval(refresh, REFRESH_MS);
		return () => clearInterval(timer);
	}, [refresh, state]);

	return { sections: cache[state] ?? [], error, loading, refresh };
}
