import * as path from "path";
import { spawnPromise } from "../child_process";

export async function generateGql(cwd: string): Promise<void> {
	// node_modules/@graphql-codegen/cli/bin.js -c node_modules/@atomist/skill/graphql/codegen.yaml
	const cli = path.join(
		cwd,
		"node_modules",
		"@graphql-codegen",
		"cli",
		"bin.js",
	);
	const config = path.join(
		cwd,
		"node_modules",
		"@atomist",
		"skill",
		"graphql",
		"codegen.yaml",
	);

	await spawnPromise(cli, ["--config", config]);
}
