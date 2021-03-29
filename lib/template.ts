/*
 * Copyright © 2021 Atomist, Inc.
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

export async function render(
	name: string,
	view: Record<string, any>,
): Promise<string> {
	const handlebars = await hb();
	const templates = await findTemplate(name);
	const template = handlebars.compile(templates.template, { noEscape: true });
	const partials = {};
	templates.partials.forEach(
		p => (partials[p.name] = handlebars.compile(p.partial)),
	);
	return template(view, {
		partials,
	}).toString();
}

async function hb(): Promise<any> {
	const handlebars = await import("handlebars");
	handlebars.registerHelper("italic", arg => `_${arg}_`);
	handlebars.registerHelper(
		"code",
		arg => new handlebars.SafeString(`\`${arg}\``),
	);
	handlebars.registerHelper(
		"codeblock",
		arg => new handlebars.SafeString(`\n\`\`\`\n${arg}\n\`\`\`\n`),
	);
	handlebars.registerHelper("bold", arg => `__${arg}__`);
	handlebars.registerHelper("link", (name, url) => `[${name}](${url})`);
	return handlebars;
}

async function findTemplate(
	name: string,
): Promise<{
	template: string;
	partials: Array<{ name: string; partial: string }>;
}> {
	const trace = await import("stack-trace");
	const stack = trace.get();
	const callSite = stack
		.filter(s => !!s.getFileName())
		.find(
			s =>
				!s.getFileName().includes("node_modules/@atomist/skill") &&
				s.getFileName().startsWith("/"),
		);

	if (callSite) {
		// This only works for Node.js > 12
		let cwd = path.dirname(callSite.getFileName());
		while (cwd) {
			const p = await (await import("find-up"))("views", {
				cwd,
				type: "directory",
			});
			if (!p) {
				throw new Error(`No 'views' found up from '${cwd}'`);
			}
			const templatePath = path.join(p, `${name}.hbs`);
			const partialsPath = path.join(p, "partials");
			if (await fs.pathExists(templatePath)) {
				const template = (await fs.readFile(templatePath))
					.toString()
					.trim();
				const partials = [];
				if (await fs.pathExists(partialsPath)) {
					for (const partial of await fs.readdir(partialsPath)) {
						if (
							(
								await fs.lstat(path.join(partialsPath, partial))
							).isFile()
						) {
							partials.push({
								name: path.basename(partial, ".hbs"),
								partial: (
									await fs.readFile(
										path.join(partialsPath, partial),
									)
								)
									.toString()
									.trim(),
							});
						}
					}
				}
				return {
					template,
					partials,
				};
			} else {
				cwd = cwd.split(path.sep).slice(0, -1).join(path.sep);
			}
		}
	}
	throw new Error(`Template file not found '${name}'`);
}
