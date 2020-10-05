#! /usr/bin/env node
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

// tslint:disable-next-line:no-import-side-effect
import "source-map-support/register";

import * as yargs from "yargs";
import { error } from "../lib/log";

// tslint:disable-next-line:no-unused-expression
yargs
	.command(
		"run",
		"Run a container skill locally using docker",
		args =>
			args.options({
				cwd: {
					alias: "c",
					type: "string",
					description: "Set working directory",
					default: process.cwd(),
					demandOption: false,
				},
				event: {
					alias: "e",
					type: "string",
					description: "Path to event payload",
					demandOption: false,
				},
				repo: {
					alias: "r",
					type: "string",
					description: "Path to repository to mount into container",
					demandOption: false,
				},
				skill: {
					alias: "s",
					type: "string",
					description: "Name of skill.yaml file run",
					demandOption: false,
					defaultValue: "skill.yaml",
				},
				verbose: {
					type: "boolean",
					description: "Enable verbose logging",
					default: false,
					demandOption: false,
				},
			}),
		async argv => {
			return (await import("../lib/script/skill_run")).runSkill(argv);
		},
	)
	.command(
		"push",
		"Push a skill",
		args =>
			args.options({
				cwd: {
					alias: "c",
					type: "string",
					description: "Set working directory",
					default: process.cwd(),
					demandOption: false,
				},
				repo: {
					alias: "r",
					type: "string",
					description: "Path to repository to mount into container",
					demandOption: false,
				},
				skill: {
					alias: "s",
					type: "string",
					description: "Name of skill.yaml file run",
					demandOption: false,
					defaultValue: "skill.yaml",
				},
				workspace: {
					type: "string",
					description: "Id of workspace",
					demandOption: false,
				},
				apiKey: {
					type: "string",
					description: "API key",
					demandOption: false,
				},
				verbose: {
					type: "boolean",
					description: "Enable verbose logging",
					default: false,
					demandOption: false,
				},
			}),
		async argv => {
			return (await import("../lib/script/skill_push")).pushSkill(argv);
		},
	)
	.command(
		"invoke",
		"Invoke container skill",
		args =>
			args.options({
				skill: {
					type: "string",
					description: "Name of skill to load",
					demandOption: false,
				},
			}),
		async argv => {
			return (await import("../lib/script/skill_invoke")).invokeSkill(
				argv.skill,
			);
		},
	)
	.command(
		["generate", "gen"],
		"Generate skill metadata",
		args =>
			args.option({
				cwd: {
					type: "string",
					description: "Set working directory",
					default: process.cwd(),
					demandOption: false,
				},
				validate: {
					type: "boolean",
					description: "Validate metadata",
					demandOption: false,
				},
			}),
		async argv => {
			try {
				await (await import("../lib/script/skill_input")).generateSkill(
					argv.cwd,
					argv.validate,
				);
				return 0;
			} catch (e) {
				error(e.message);
				process.exit(1);
			}
		},
	)
	.command(
		["bundle"],
		"Bundle skill and dependencies",
		args =>
			args.option({
				cwd: {
					type: "string",
					description: "Set working directory",
					default: process.cwd(),
					demandOption: false,
				},
				minify: {
					type: "boolean",
					description: "Minify bundled sources",
					default: false,
					demandOption: false,
				},
				sourceMap: {
					type: "boolean",
					description: "Create source map",
					default: false,
					demandOption: false,
				},
				file: {
					type: "string",
					description: "Name of entryPoint file",
					default: "skill.bundle.js",
					demandOption: false,
				},
				verbose: {
					type: "boolean",
					description: "Enable verbose logging",
					default: false,
					demandOption: false,
				},
			}),
		async argv => {
			try {
				await (await import("../lib/script/skill_bundle")).bundleSkill(
					argv.cwd,
					argv.minify,
					argv.sourceMap,
					argv.verbose,
					argv.file,
				);
				return 0;
			} catch (e) {
				error(e.message);
				process.exit(1);
			}
		},
	)
	.command(
		["package", "pkg"],
		"Package skill archive",
		args =>
			args.option({
				cwd: {
					type: "string",
					description: "Set working directory",
					default: process.cwd(),
					demandOption: false,
				},
				verbose: {
					type: "boolean",
					description: "Enable verbose logging",
					default: false,
					demandOption: false,
				},
			}),
		async argv => {
			try {
				await (
					await import("../lib/script/skill_package")
				).packageSkill(argv.cwd, argv.verbose);
				return 0;
			} catch (e) {
				error(e.message);
				process.exit(1);
			}
		},
	)
	.command(
		["clean"],
		"Clean skill archive",
		args =>
			args.option({
				cwd: {
					type: "string",
					description: "Set working directory",
					default: process.cwd(),
					demandOption: false,
				},
				verbose: {
					type: "boolean",
					description: "Enable verbose logging",
					default: false,
					demandOption: false,
				},
			}),
		async argv => {
			try {
				await (await import("../lib/script/skill_clean")).cleanSkill(
					argv.cwd,
				);
				return 0;
			} catch (e) {
				error(e.message);
				process.exit(1);
			}
		},
	)
	.command(
		["register", "reg"],
		"Register skill",
		args =>
			args.option({
				cwd: {
					type: "string",
					description: "Set working directory",
					default: process.cwd(),
					demandOption: false,
				},
				workspace: {
					type: "string",
					description: "Id of workspace to register",
					demandOption: false,
				},
				version: {
					type: "string",
					description: "Version of skill",
					demandOption: false,
				},
				verbose: {
					type: "boolean",
					description: "Enable verbose logging",
					default: false,
					demandOption: false,
				},
			}),
		async argv => {
			try {
				await (
					await import("../lib/script/skill_register")
				).registerSkill(
					argv.cwd,
					argv.workspace,
					argv.version,
					argv.verbose,
				);
				return 0;
			} catch (e) {
				error(e.message);
				process.exit(1);
			}
		},
	)
	.command(
		["gql-fetch"],
		"Fetch GraphQL schema",
		args =>
			args.option({
				cwd: {
					type: "string",
					description: "Set working directory",
					default: process.cwd(),
					demandOption: false,
				},
				workspace: {
					type: "string",
					description: "Id of workspace to fetch schema for",
					demandOption: false,
				},
			}),
		async argv => {
			try {
				await (await import("../lib/script/gql_fetch")).fetchGql(
					argv.cwd,
					argv.workspace,
				);
				return 0;
			} catch (e) {
				error(e.message);
				process.exit(1);
			}
		},
	)
	.version(false)
	.strict()
	.help().argv;
