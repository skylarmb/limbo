import { useCallback, useEffect, useState } from "react";
import { REFRESH_MS } from "./config";
import { fetchSections, type Section } from "./github";

// Loads sections on mount, polls every REFRESH_MS, and exposes a manual refresh.
export function useSections() {
	const [sections, setSections] = useState<Section[]>([]);
	const [error, setError] = useState<string>();
	const [loading, setLoading] = useState(true);

	const refresh = useCallback(async () => {
		setLoading(true);
		try {
			setSections(await fetchSections());
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

	return { sections, error, loading, refresh };
}
