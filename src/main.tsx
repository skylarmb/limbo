import { render } from "ink";
import { App } from "./App";
import { fetchSections } from "./github";

render(<App fetchSections={fetchSections} />);
