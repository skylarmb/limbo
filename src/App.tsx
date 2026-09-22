import { Box, Text, useApp, useInput } from "ink";
import { usePullRequests } from "./usePullRequests";

export function App() {
	const { exit } = useApp();
	const { prs, error, loading, refresh } = usePullRequests();

	// r = refresh, q = quit.
	useInput((input) => {
		if (input === "r") refresh();
		if (input === "q") exit();
	});

	return (
		<Box flexDirection="column">
			{error && <Text>error: {error}</Text>}
			{loading && prs.length === 0 && <Text>loading…</Text>}
			{prs.map((pr) => (
				<Text key={pr.id}>
					{pr.repository.nameWithOwner}#{pr.number} {pr.title} @
					{pr.author?.login ?? "ghost"}
				</Text>
			))}
		</Box>
	);
}
