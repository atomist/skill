import * as fs from "fs-extra";
import * as yaml from "js-yaml";
import * as path from "path";

import { createDatalogClient } from "../datalog/client";
import { Skill } from "../payload";
import { guid } from "../util";
import { AtomistSkillInput } from "./skill_input";
import { apiKey, wid } from "./skill_register";

export async function query(args: {
	cwd: string;
	query: string;
	config?: string;
	workspace?: string;
	parse: boolean;
	tx?: number;
}): Promise<void> {
	const skill: Skill = {
		id: guid(),
	} as any;

	if (args.config) {
		const content = (
			await fs.readFile(path.join(args.cwd, ".atomist", "skill.yaml"))
		).toString();
		const atomistYaml: { skill: AtomistSkillInput } = yaml.load(
			content,
		) as any;
		skill.name = atomistYaml.skill.name;
		skill.namespace = atomistYaml.skill.namespace;
		skill.version = atomistYaml.skill.version;
		skill.configuration = {
			name: args.config,
		} as any;
	}

	const client = createDatalogClient(
		await apiKey(),
		await wid(args.workspace),
		guid(),
		skill,
	);

	const query = (
		await fs.readFile(path.join(args.cwd, args.query))
	).toString();
	const result = await client.query(query, {
		configurationName: args.config,
		tx: args.tx,
		raw: !args.parse,
	});
	if (args.parse) {
		console.log(JSON.stringify(result));
	} else {
		console.log(result);
	}
}
