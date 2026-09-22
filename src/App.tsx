import { Box, Text, useApp, useInput } from "ink";
import { statusOf } from "./status";
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
				<Box key={pr.id}>
					{/* Fixed width so titles line up; fits the longest status. */}
					<Box width={18} flexShrink={0}>
						<Text>{statusOf(pr)}</Text>
					</Box>
					<Text>
						{pr.repository.nameWithOwner}#{pr.number} {pr.title} @
						{pr.author?.login ?? "ghost"}
					</Text>
				</Box>
			))}
		</Box>
	);
}
