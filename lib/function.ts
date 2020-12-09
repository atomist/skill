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

import { Severity } from "@atomist/skill-logging";
import { eventHandlerLoader } from "./action";
import { ContextFactory, createContext } from "./context";
import {
	CommandContext,
	CommandHandler,
	ContextualLifecycle,
	EventContext,
	EventHandler,
	HandlerStatus,
	WebhookContext,
	WebhookHandler,
} from "./handler";
import { debug, info } from "./log";
import { prepareStatus, StatusPublisher } from "./message";
import {
	CommandIncoming,
	EventIncoming,
	isCommandIncoming,
	isEventIncoming,
	isSubscriptionIncoming,
	isWebhookIncoming,
	SubscriptionIncoming,
	WebhookIncoming,
} from "./payload";
import { CommandListenerExecutionInterruptError } from "./prompt/prompt";
import { handlerLoader, replacer } from "./util";

export interface PubSubMessage {
	data: string;
	attributes: any;
}

export const entryPoint = async (
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

	if (isEventIncoming(payload) || isSubscriptionIncoming(payload)) {
		await processEvent(payload, context);
	} else if (isCommandIncoming(payload)) {
		await processCommand(payload, context);
	} else if (isWebhookIncoming(payload)) {
		await processWebhook(payload, context);
	}
};

export async function processEvent(
	event: EventIncoming | SubscriptionIncoming,
	ctx: { eventId: string },
	loader: (name: string) => Promise<EventHandler> = eventHandlerLoader(
		"events",
	),
	factory: ContextFactory = createContext,
): Promise<void> {
	const context = factory(event, ctx) as EventContext<any> &
		ContextualLifecycle;
	try {
		debug(`Invoking event handler '${context.name}'`);
		const result = (await (await loader(context.name))(
			context,
		)) as HandlerStatus;
		await ((context.message as any) as StatusPublisher).publish(
			prepareStatus(result || { code: 0 }, context),
		);
	} catch (e) {
		await context.audit.log(`Error occurred: ${e.stack}`, Severity.Error);
		await ((context.message as any) as StatusPublisher).publish(
			prepareStatus(e, context),
		);
	} finally {
		await context.close();
	}
	debug(`Completed event handler '${context.name}'`);
}

export async function processCommand(
	event: CommandIncoming,
	ctx: { eventId: string },
	loader: (name: string) => Promise<CommandHandler> = handlerLoader(
		"commands",
	),
	factory: ContextFactory = createContext,
): Promise<void> {
	const context = factory(event, ctx) as CommandContext & ContextualLifecycle;
	try {
		debug(`Invoking command handler '${context.name}'`);
		const result = (await (await loader(context.name))(
			context,
		)) as HandlerStatus;
		await ((context.message as any) as StatusPublisher).publish(
			prepareStatus(result || { code: 0 }, context),
		);
	} catch (e) {
		if (e instanceof CommandListenerExecutionInterruptError) {
			await ((context.message as any) as StatusPublisher).publish(
				prepareStatus({ code: 0 }, context),
			);
		} else {
			await context.audit.log(
				`Error occurred: ${e.stack}`,
				Severity.Error,
			);
			await ((context.message as any) as StatusPublisher).publish(
				prepareStatus(e, context),
			);
		}
	} finally {
		await context.close();
	}
	debug(`Completed command handler '${context.name}'`);
}

export async function processWebhook(
	event: WebhookIncoming,
	ctx: { eventId: string },
	loader: (name: string) => Promise<WebhookHandler> = handlerLoader(
		"webhooks",
	),
	factory: ContextFactory = createContext,
): Promise<void> {
	const context = factory(event, ctx) as WebhookContext & ContextualLifecycle;
	try {
		debug(`Invoking webhook handler '${context.name}'`);
		const result = (await (await loader(context.name))(
			context,
		)) as HandlerStatus;
		await ((context.message as any) as StatusPublisher).publish(
			prepareStatus(result || { code: 0 }, context),
		);
	} catch (e) {
		if (e instanceof CommandListenerExecutionInterruptError) {
			await ((context.message as any) as StatusPublisher).publish(
				prepareStatus({ code: 0 }, context),
			);
		} else {
			await context.audit.log(
				`Error occurred: ${e.stack}`,
				Severity.Error,
			);
			await ((context.message as any) as StatusPublisher).publish(
				prepareStatus(e, context),
			);
		}
	} finally {
		await context.close();
	}
	debug(`Completed webhook handler '${context.name}'`);
}
