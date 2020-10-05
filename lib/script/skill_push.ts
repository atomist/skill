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
import * as yaml from "js-yaml";
import * as path from "path";
import { createGraphQLClient, GraphQLClient } from "../graphql";
import { info } from "../log";
import { defaults } from "./skill_container";
import { AtomistSkillInput } from "./skill_input";
import { apiKey, wid } from "./skill_register";
import semver = require("semver/preload");
import merge = require("lodash.merge");

export async function pushSkill(options: {
	cwd: string;
	repo?: string;
	skill: string;
	workspace?: string;
	apiKey?: string;
	verbose?: boolean;
}): Promise<void> {
	if (!options.verbose) {
		process.env.ATOMIST_LOG_LEVEL = "info";
	}
	info("Pushing skill...");

	const w = await wid(options.workspace);
	const client = createGraphQLClient(await apiKey(), w);

	const content = (
		await fs.readFile(path.join(options.cwd, options.skill))
	).toString();
	const skillDefaults = await defaults(options.cwd);
	const skillYaml = (yaml.safeLoad(content) as any).skill;
	const skill: AtomistSkillInput = merge({}, skillDefaults, skillYaml);

	const rs = await getSkill(client, skill.namespace, skill.name);
	const rc = rs ? await getSkillConfigurations(client, rs.id) : [];
	const version = rs ? rs.version : "0.0.0";

	skill.version = semver.inc(version, "minor");
	skill.repoId = "local";
	skill.commitSha = "local";
	((skill as any).maturity = "stable"), await register(client, skill);

	info(
		`Registered skill '${skill.namespace}/${skill.name}' with version '${skill.version}'`,
	);

	if (rc.length > 0) {
		info(
			`Manage skill at https://go.atomist.com/${w}/manage/skills?filter=${skill.name}`,
		);
	} else {
		info(
			`Configure skill at https://go.atomist.com/${w}/manage/skills/configure/new/${skill.namespace}/${skill.name}`,
		);
	}
}

const RegisterSkillMutation = `mutation registerSkill($skill: AtomistSkillInput!) {
    registerSkill(skill: $skill) {
        id
    }
}
`;

async function register(
	client: GraphQLClient,
	skill: AtomistSkillInput,
): Promise<void> {
	await client.mutate(RegisterSkillMutation, {
		skill,
	});
}

const GetSkillQuery = `query skillByNamespaceAndName($name: String!, $namespace: String!) {
  getSkill(namespace: $namespace, name: $name) {
  	id
    version
    name
    namespace
  }
}`;

async function getSkill(
	client: GraphQLClient,
	namespace: string,
	name: string,
): Promise<{ name: string; namespace: string; version: string; id: string }> {
	const result = await client.query(GetSkillQuery, { name, namespace });
	return result.getSkill;
}

const GetSkillConfigurationQuery = `query skillById($id: ID!) {
  AtomistSkill(id: $id) {
    id
    name
    version
    namespace
    configuration {
      instances {
        name
        displayName
      }
    }
  }
}
`;

async function getSkillConfigurations(
	client: GraphQLClient,
	id: string,
): Promise<Array<{ name: string }>> {
	const result = await client.query(GetSkillConfigurationQuery, { id });
	return result.AtomistSkill?.[0]?.configuration?.instances || [];
}
