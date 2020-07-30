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

export function named(name: string): string {
	const ix = name.lastIndexOf("/");
	const module = name.slice(0, ix);
	const file = name.slice(ix + 1);
	const root = __dirname.includes("node_modules")
		? path.join(__dirname.split("node_modules")[0], module)
		: process.cwd();
	const filePath = path.join(
		root,
		"graphql",
		"subscription",
		`${file}.graphql`,
	);
	return fs.readFileSync(filePath).toString();
}
