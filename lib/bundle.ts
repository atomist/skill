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

import { processCommand, processEvent, PubSubMessage } from "./function";
import { CommandHandler, EventHandler } from "./handler";
import { debug, info } from "./log";
import {
	CommandIncoming,
	EventIncoming,
	isCommandIncoming,
	isEventIncoming,
} from "./payload";
import { replacer } from "./util";

const HandlerRegistry = {
	events: {},
	commands: {},
};

/**
 * Register a command handler with a certain name
 */
export function registerCommand(
	name: string,
	loader: () => Promise<CommandHandler>,
): void {
	HandlerRegistry.commands[name] = loader;
}

/**
 * Register a event handler with a certain name
 */
export function registerEvent(
	name: string,
	loader: () => Promise<EventHandler>,
): void {
	HandlerRegistry.events[name] = loader;
}

export const bundle = async (
	pubSubEvent: PubSubMessage,
	context: { eventId: string },
): Promise<void> => {
	const attributes = {
		...(pubSubEvent.attributes || {}),
		eventId: context.eventId,
	};
	debug(`atm:attributes=${JSON.stringify(attributes)}`);

	const payload: CommandIncoming | EventIncoming = JSON.parse(
		Buffer.from(pubSubEvent.data, "base64").toString(),
	);
	info(`Incoming pub/sub message: ${JSON.stringify(payload, replacer)}`);

	if (isEventIncoming(payload)) {
		return processEvent(payload, context, async () => {
			const loader = HandlerRegistry.events[payload.extensions.operationName];
			if (loader) {
				return loader();
			} else {
				throw new Error(
					`Event handler with name '${payload.extensions.operationName}' not registered`,
				);
			}
		});
	} else if (isCommandIncoming(payload)) {
		return processCommand(payload, context, async () => {
			const loader = HandlerRegistry.commands[payload.command];
			if (loader) {
				return loader();
			} else {
				throw new Error(
					`Command handler with name '${payload.command}' not registered`,
				);
			}
		});
	}
};
