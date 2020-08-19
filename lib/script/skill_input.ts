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
import { named } from "../definition/subscription/named";
import { error, info } from "../log";
import { withGlobMatches } from "../project/util";
import { Skill } from "../definition/skill";
import { handleError, handlerLoader } from "../util";
import { createYamlSkillInput, defaults } from "./skill_container";
import map = require("lodash.map");

export type Maybe<T> = T | null;

export type Scalars = {
	ID: string;
	String: string;
	Boolean: boolean;
	Int: number;
	Float: number;
};

/** Start: registration inputs */
export type AtomistSkillInput = {
	artifacts: AtomistSkillArtifactsInput;
	author: Scalars["String"];
	branchId: Scalars["String"];
	categories?: Maybe<Array<AtomistSkillCategoryKey>>;
	commands?: Maybe<Array<AtomistChatCommandInput>>;
	commitSha: Scalars["String"];
	description: Scalars["String"];
	dispatchStyle?: Maybe<AtomistSkillEventDispatchStyle>;
	displayName?: Maybe<Scalars["String"]>;
	homepageUrl: Scalars["String"];
	iconUrl: Scalars["String"];
	ingesters?: Maybe<Array<Scalars["String"]>>;
	license: Scalars["String"];
	longDescription: Scalars["String"];
	maxConfigurations?: Maybe<Scalars["Int"]>;
	name: Scalars["String"];
	namespace: Scalars["String"];
	parameters?: Maybe<Array<AtomistSkillParameterSpecInput>>;
	readme?: Maybe<Scalars["String"]>;
	repoId: Scalars["String"];
	resourceProviders?: Maybe<Array<AtomistSkillResourceProviderSpecInput>>;
	subscriptions?: Maybe<Array<Scalars["String"]>>;
	technologies?: Maybe<Array<AtomistSkillTechnology>>;
	version: Scalars["String"];
	videoUrl?: Maybe<Scalars["String"]>;
	gateSubscriptions?: Maybe<Array<AtomistGateRefInput>>;
	gates?: Maybe<Array<AtomistGateInput>>;
	signals?: Maybe<Array<Scalars["String"]>>;
};

export type AtomistSkillArtifactsInput = {
	docker?: Maybe<Array<AtomistDockerSkillArtifactInput>>;
	gcf?: Maybe<Array<AtomistGcfSkillArtifactInput>>;
};

export type AtomistDockerSkillArtifactInput = {
	args?: Maybe<Array<Scalars["String"]>>;
	command?: Maybe<Array<Scalars["String"]>>;
	env?: Maybe<Array<AtomistSkillEnvVariableInput>>;
	image: Scalars["String"];
	name: Scalars["ID"];
	workingDir?: Maybe<Scalars["String"]>;
};

export type AtomistSkillEnvVariableInput = {
	name: Scalars["String"];
	value: Scalars["String"];
};

export type AtomistGcfSkillArtifactInput = {
	entryPoint: Scalars["String"];
	memory?: Maybe<Scalars["Int"]>;
	name: Scalars["ID"];
	runtime: AtomistSkillRuntime;
	timeout?: Maybe<Scalars["Int"]>;
	url: Scalars["String"];
};

export enum AtomistSkillRuntime {
	Nodejs10 = "nodejs10",
	Python37 = "python37",
	Go113 = "go113",
}

export enum AtomistSkillCategoryKey {
	Build = "BUILD",
	Chat = "CHAT",
	CodeQuality = "CODE_QUALITY",
	CodeReview = "CODE_REVIEW",
	Dependencies = "DEPENDENCIES",
	Deploy = "DEPLOY",
	DevEx = "DEVEX",
	DevOps = "DEVOPS",
	Issues = "ISSUES",
	Monitor = "MONITOR",
	Notifications = "NOTIFICATIONS",
	ProjectManagement = "PROJECT_MANAGEMENT",
	Security = "SECURITY",
}

export type AtomistChatCommandInput = {
	description: Scalars["String"];
	displayName?: Maybe<Scalars["String"]>;
	name: Scalars["String"];
	pattern: Scalars["String"];
};

export enum AtomistSkillEventDispatchStyle {
	Single = "single",
	Multiple = "multiple",
}

export enum AtomistSkillParameterVisiblity {
	Hidden = "hidden",
	Advanced = "advanced",
	Normal = "normal",
}

export type AtomistSkillParameterSpecInput = {
	boolean?: Maybe<AtomistSkillBooleanParameterSpecInput>;
	chatChannels?: Maybe<AtomistSkillChatChannelsParameterSpecInput>;
	float?: Maybe<AtomistSkillFloatParameterSpecInput>;
	int?: Maybe<AtomistSkillIntParameterSpecInput>;
	multiChoice?: Maybe<AtomistSkillMultiChoiceParameterSpecInput>;
	repoFilter?: Maybe<AtomistSkillRepoFilterParameterSpecInput>;
	schedule?: Maybe<AtomistSkillScheduleParameterSpecInput>;
	singleChoice?: Maybe<AtomistSkillSingleChoiceParameterSpecInput>;
	string?: Maybe<AtomistSkillStringParameterSpecInput>;
	stringArray?: Maybe<AtomistSkillStringArrayParameterSpecInput>;
};

export type AtomistSkillBooleanParameterSpecInput = {
	defaultValue?: Maybe<Scalars["Boolean"]>;
	description: Scalars["String"];
	displayName?: Maybe<Scalars["String"]>;
	name: Scalars["String"];
	required: Scalars["Boolean"];
};

export type AtomistSkillChatChannelsParameterSpecInput = {
	description: Scalars["String"];
	displayName?: Maybe<Scalars["String"]>;
	maxAllowed?: Maybe<Scalars["Int"]>;
	minRequired?: Maybe<Scalars["Int"]>;
	name: Scalars["String"];
	required: Scalars["Boolean"];
	visibility?: Maybe<AtomistSkillParameterVisiblity>;
};

export type AtomistSkillFloatParameterSpecInput = {
	defaultValue?: Maybe<Scalars["Float"]>;
	description: Scalars["String"];
	displayName?: Maybe<Scalars["String"]>;
	maximum?: Maybe<Scalars["Float"]>;
	minimum?: Maybe<Scalars["Float"]>;
	name: Scalars["String"];
	placeHolder?: Maybe<Scalars["String"]>;
	required: Scalars["Boolean"];
	visibility?: Maybe<AtomistSkillParameterVisiblity>;
};

export type AtomistSkillIntParameterSpecInput = {
	defaultValue?: Maybe<Scalars["Int"]>;
	description: Scalars["String"];
	displayName?: Maybe<Scalars["String"]>;
	maximum?: Maybe<Scalars["Int"]>;
	minimum?: Maybe<Scalars["Int"]>;
	name: Scalars["String"];
	placeHolder?: Maybe<Scalars["String"]>;
	required: Scalars["Boolean"];
	visibility?: Maybe<AtomistSkillParameterVisiblity>;
};

export type AtomistSkillMultiChoiceParameterSpecInput = {
	defaultValues?: Maybe<Array<Scalars["String"]>>;
	description: Scalars["String"];
	displayName?: Maybe<Scalars["String"]>;
	maxAllowed?: Maybe<Scalars["Int"]>;
	minRequired?: Maybe<Scalars["Int"]>;
	name: Scalars["String"];
	options?: Maybe<Array<AtomistSkillChoiceInput>>;
	required: Scalars["Boolean"];
	visibility?: Maybe<AtomistSkillParameterVisiblity>;
};

export type AtomistSkillChoiceInput = {
	description?: Maybe<Scalars["String"]>;
	text: Scalars["String"];
	value: Scalars["String"];
};

export type AtomistSkillRepoFilterParameterSpecInput = {
	description: Scalars["String"];
	displayName?: Maybe<Scalars["String"]>;
	name: Scalars["String"];
	required: Scalars["Boolean"];
	visibility?: Maybe<AtomistSkillParameterVisiblity>;
};

export type AtomistSkillScheduleParameterSpecInput = {
	defaultValue?: Maybe<Scalars["String"]>;
	description: Scalars["String"];
	displayName?: Maybe<Scalars["String"]>;
	name: Scalars["String"];
	required: Scalars["Boolean"];
	visibility?: Maybe<AtomistSkillParameterVisiblity>;
};

export type AtomistSkillSingleChoiceParameterSpecInput = {
	defaultValue?: Maybe<Scalars["String"]>;
	description: Scalars["String"];
	displayName?: Maybe<Scalars["String"]>;
	name: Scalars["String"];
	options?: Maybe<Array<AtomistSkillChoiceInput>>;
	required: Scalars["Boolean"];
	visibility?: Maybe<AtomistSkillParameterVisiblity>;
};

export type AtomistSkillStringParameterSpecInput = {
	defaultValue?: Maybe<Scalars["String"]>;
	description: Scalars["String"];
	displayName?: Maybe<Scalars["String"]>;
	lineStyle?: Maybe<AtomistSkillStringParameterLineStyle>;
	name: Scalars["String"];
	pattern?: Maybe<Scalars["String"]>;
	placeHolder?: Maybe<Scalars["String"]>;
	required: Scalars["Boolean"];
	visibility?: Maybe<AtomistSkillParameterVisiblity>;
};

export enum AtomistSkillStringParameterLineStyle {
	Single = "single",
	Multiple = "multiple",
}

export type AtomistSkillStringArrayParameterSpecInput = {
	defaultValue?: Maybe<Array<Maybe<Scalars["String"]>>>;
	description: Scalars["String"];
	displayName?: Maybe<Scalars["String"]>;
	maxAllowed?: Maybe<Scalars["Int"]>;
	minRequired?: Maybe<Scalars["Int"]>;
	name: Scalars["String"];
	pattern?: Maybe<Scalars["String"]>;
	required: Scalars["Boolean"];
	visibility?: Maybe<AtomistSkillParameterVisiblity>;
};

export type AtomistSkillResourceProviderSpecInput = {
	description?: Maybe<Scalars["String"]>;
	maxAllowed?: Maybe<Scalars["Int"]>;
	minRequired?: Maybe<Scalars["Int"]>;
	name: Scalars["String"];
	typeName: Scalars["String"];
};

export enum AtomistSkillTechnology {
	Java = "JAVA",
	Maven = "MAVEN",
	Docker = "DOCKER",
	Javascript = "JAVASCRIPT",
	Npm = "NPM",
	Lein = "LEIN",
	Clojure = "CLOJURE",
	Kubernetes = "KUBERNETES",
}

export type AtomistGateRefInput = {
	name: Scalars["String"];
	namespace?: Maybe<Scalars["String"]>;
};

export type AtomistGateInput = {
	and: Array<AtomistGateRefInput>;
	name: Scalars["String"];
};

export async function createJavaScriptSkillInput(
	cwd: string,
	name = "index.js",
): Promise<AtomistSkillInput> {
	const p = path.join(cwd, name);
	info(`Generating skill metadata...`);

	const is: Skill = {
		...((await defaults(cwd)) as any),
		...(await handleError<Skill>(
			async () => await (await import(p)).Skill,
			() => {
				error(`Error loading '${p}'`);
				return undefined;
			},
		)),
	};

	if (!is) {
		throw new Error(`Failed to load exported Skill constant from '${p}'`);
	}

	const rc = content(cwd);

	const subscriptions = [];
	for (const subscription of is.subscriptions || [
		"file://**/graphql/subscription/*.graphql",
	]) {
		subscriptions.push(...(await rc(subscription)));
	}
	const signals = [];
	for (const signal of is.signals || ["file://**/graphql/signal/*.graphql"]) {
		signals.push(...(await rc(signal)));
	}

	const artifacts: any = {};
	if (!is.containers) {
		artifacts.gcf = [
			{
				entryPoint: is.runtime?.entryPoint || "entryPoint",
				memory: is.runtime?.memory || 256,
				timeout: is.runtime?.timeout || 60,
				runtime:
					(is.runtime?.platform as any) ||
					AtomistSkillRuntime.Nodejs10,
				name: "gcf",
				url: undefined,
			},
		];
	} else {
		artifacts.docker = map(is.containers, (v, k) => ({
			name: k,
			...v,
		}));
	}

	const y: Omit<AtomistSkillInput, "commitSha" | "branchId" | "repoId"> = {
		name: is.name,
		namespace: is.namespace,
		displayName: is.displayName,
		version: is.version,
		author: is.author,
		description: is.description,
		longDescription: is.longDescription,
		license: is.license,
		categories: is.categories as any,
		technologies: is.technologies as any,
		homepageUrl: is.homepageUrl,
		iconUrl: await icon(cwd, is.iconUrl),
		videoUrl: is.videoUrl,

		readme: is.readme
			? Buffer.from(is.readme).toString("base64")
			: undefined,

		maxConfigurations: is.maxConfigurations,
		dispatchStyle: is.dispatchStyle as any,

		artifacts,

		resourceProviders: map(is.resourceProviders || {}, (v, k) => ({
			name: k,
			displayName: v.displayName,
			typeName: v.typeName,
			description: v.description,
			minRequired: v.minRequired,
			maxAllowed: v.maxAllowed,
		})),

		parameters: map(is.parameters || {}, (v, k) => {
			const type = v.type;
			delete v.type;
			return {
				[type]: {
					name: k,
					...v,
				},
			};
		}),

		commands: (is.commands || []).map(c => ({
			name: c.name,
			displayName: c.displayName,
			description: c.description,
			pattern: c.pattern.source,
		})),

		subscriptions,

		signals,
		gates: map(is.gates || {}, (v, k) => ({
			name: k,
			and: v,
		})),
		gateSubscriptions: is.gateSubscriptions,
	};

	if (!y.longDescription) {
		y.longDescription = y.description;
	}

	return y as any;
}

export async function validateSkillInput(
	cwd: string,
	s: AtomistSkillInput,
	options: { validateHandlers: boolean } = { validateHandlers: true },
): Promise<void> {
	const errors = [];

	// Check required fields
	const requiredFields = [
		"name",
		"namespace",
		"description",
		"longDescription",
		"author",
		"homepageUrl",
		"iconUrl",
		"license",
	];
	for (const requiredField of requiredFields) {
		if (!s[requiredField]) {
			errors.push(`Required field '${requiredField}' missing`);
		}
	}

	// Check categories against schema
	for (const category of s.categories || []) {
		if (!Object.values(AtomistSkillCategoryKey).includes(category as any)) {
			errors.push(`Category '${category}' invalid`);
		}
	}

	// Check technologies against schema
	for (const technology of s.technologies || []) {
		if (
			!Object.values(AtomistSkillTechnology).includes(technology as any)
		) {
			errors.push(`Technology '${technology}' invalid`);
		}
	}

	if (options.validateHandlers) {
		// Validate commands
		for (const command of s.commands || []) {
			await handleError(
				async () => {
					const p = await handlerLoader(`commands/${command.name}`);
					if (!p) {
						errors.push(
							`Registered command '${command.name}' can't be found`,
						);
					}
				},
				err => {
					errors.push(
						`Registered command '${command.name}' can't be found: ${err.message}`,
					);
				},
			);
		}

		// Validate subscriptions
		for (const subscription of s.subscriptions || []) {
			const match = subscription.match(/subscription\s([^\s({]+)[\s({]/);
			if (match) {
				const operationName = match[1];
				await handleError(
					async () => {
						const p = await handlerLoader(
							`events/${operationName}`,
						);
						if (!p) {
							errors.push(
								`Registered event handler '${operationName}' can't be found`,
							);
						}
					},
					err => {
						errors.push(
							`Registered event handler '${operationName}' can't be found: ${err.message}`,
						);
					},
				);
			}
		}
	}

	if (errors.length > 0) {
		error(`Skill metadata contains errors:
${errors.map(e => `        - ${e}`).join("\n")}`);
		throw new Error(`Failed to generate skill metadata`);
	}
}

export async function generateSkill(
	cwd: string,
	validate: boolean,
): Promise<void> {
	let s;
	let forceValidate = validate;
	if (forceValidate === undefined) {
		forceValidate = await fs.pathExists(path.join(cwd, "package.json"));
	}
	if (await fs.pathExists(path.join(cwd, "skill.js"))) {
		s = await createJavaScriptSkillInput(cwd, "skill.js");
		await validateSkillInput(cwd, s, { validateHandlers: forceValidate });
	} else {
		s = await createYamlSkillInput(cwd);
		await validateSkillInput(cwd, s, { validateHandlers: forceValidate });
	}
	await writeSkillYaml(cwd, s);
}

export async function writeSkillYaml(
	cwd: string,
	skill: AtomistSkillInput,
): Promise<void> {
	const p = path.join(cwd, ".atomist", "skill.yaml");
	await fs.ensureDir(path.dirname(p));
	const yaml = await import("js-yaml");
	const content = yaml.safeDump(
		{
			apiVersion: 1,
			skill,
		},
		{ skipInvalid: true },
	);
	await fs.writeFile(p, content);
	info(`Written skill metadata to '${p}'`);
}

export function content(cwd: string): (key: string) => Promise<string[]> {
	return async (key: string): Promise<string[]> => {
		if (!key) {
			return [];
		}
		if (key.startsWith("file://")) {
			const pattern = key.slice(7);
			return withGlobMatches<string>(cwd, pattern, async file => {
				return (await fs.readFile(path.join(cwd, file))).toString();
			});
		} else if (key.startsWith("@")) {
			return [named(key)];
		} else {
			return [key];
		}
	};
}

export async function icon(cwd: string, key: string): Promise<string> {
	if (!key) {
		return undefined;
	}

	if (key.startsWith("file://")) {
		const data = await content(cwd)(key);
		if (data?.length > 0) {
			return `data:image/svg+xml;base64,${Buffer.from(data[0]).toString(
				"base64",
			)}`;
		} else {
			return undefined;
		}
	} else {
		return key;
	}
}
