import { Box, Text, useApp, useInput } from "ink";
import { statusOf } from "./status";
import { useSections } from "./useSections";

export function App() {
	const { exit } = useApp();
	const { sections, error, loading, refresh } = useSections();

	// r = refresh, q = quit.
	useInput((input) => {
		if (input === "r") refresh();
		if (input === "q") exit();
	});

	return (
		<Box flexDirection="column">
			{error && <Text>error: {error}</Text>}
			{loading && sections.length === 0 && <Text>loading…</Text>}
			{sections.map(({ title, prs }) => (
				// Blank line above each section separates them.
				<Box key={title} flexDirection="column" marginTop={1}>
					<Text>{title}</Text>
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
			))}
		</Box>
	);
}
