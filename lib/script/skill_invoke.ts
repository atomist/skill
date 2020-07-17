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
import { processCommand, processEvent } from "../function";
import {
	CommandIncoming,
	EventIncoming,
	isCommandIncoming,
	isEventIncoming,
} from "../payload";
import { guid, handlerLoader } from "../util";
import { apiKey, wid } from "./skill_register";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const merge = require("lodash.merge");

export async function invokeSkill(options: {
	cwd: string;
	name?: string;
	file: string;
	workspace?: string;
	apiKey?: string;
}): Promise<void> {
	const file = path.isAbsolute(options.file)
		? options.file
		: path.join(options.cwd, options.file);
	const payload = await fs.readJson(file);
	const workspaceId = await wid(options.workspace);
	const key = await apiKey(options.apiKey);

	if (isEventIncoming(payload)) {
		const metadata: Partial<EventIncoming> = {
			extensions: {
				team_id: workspaceId,
				team_name: workspaceId,
				correlation_id: guid(),
				operationName: options.name,
			},
			secrets: [
				{
					uri: "atomist://api-key",
					value: key,
				},
			],
		};
		await processEvent(
			merge(payload, metadata),
			{ eventId: metadata.extensions.correlation_id },
			async () => {
				return handlerLoader(
					`events/${payload.extensions.operationName}`,
					options.cwd,
				);
			},
		);
	} else if (isCommandIncoming(payload)) {
		const metadata: Partial<CommandIncoming> = {
			team: {
				id: workspaceId,
				name: workspaceId,
			},
			correlation_id: guid(),
			command: options.name,
			secrets: [
				{
					uri: "atomist://api-key",
					value: key,
				},
			],
		};
		await processCommand(
			merge(payload, metadata),
			{ eventId: metadata.correlation_id },
			async () => {
				return handlerLoader(`commands/${payload.command}`, options.cwd);
			},
		);
	}
}
