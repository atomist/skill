/*
 * Copyright © 2020 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as fs from "fs-extra";
import * as path from "path";
import { spawnPromise } from "../child_process";
import { globFiles } from "../project/util";
import { debug } from "../log";

export async function generateGql(options: {
	cwd: string;
	config: string;
}): Promise<void> {
	// Load globs from the codegen.yaml
	const yaml = await import("js-yaml");
	const codegen: { documents: string[] } = yaml.safeLoad(
		await fs.readFile(
			path.join(__dirname, "..", "..", "graphql", "codegen.yaml"),
		),
	) as any;

	// Fail gracefully when there are no files found
	const files = await globFiles(options.cwd, codegen.documents);
	if (files.length === 0) {
		debug("No graphql files found. Skipping type generation...");
		return;
	}

	const cli = path.join(
		options.cwd,
		"node_modules",
		"@graphql-codegen",
		"cli",
		"bin.js",
	);
	const config =
		options.config ||
		path.join(
			options.cwd,
			"node_modules",
			"@atomist",
			"skill",
			"graphql",
			"codegen.yaml",
		);

	const result = await spawnPromise(cli, ["--config", config], {
		logCommand: false,
		log: { write: async msg => console.log(msg.trimRight()) },
	});
	if (result.status !== 0) {
		throw new Error("Type generation failed");
	}
}
