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

import { createDatalogClient } from "./datalog/client";
import { createGraphQLClient } from "./graphql";
import {
	CommandContext,
	Configuration,
	ContextualLifecycle,
	EventContext,
	WebhookContext,
} from "./handler/handler";
import { createHttpClient } from "./http";
import { createAuditLogger } from "./log/util";
import { mapSubscription } from "./map";
import {
	PubSubCommandMessageClient,
	PubSubEventMessageClient,
	PubSubWebhookMessageClient,
} from "./message";
import {
	CommandIncoming,
	EventIncoming,
	isCommandIncoming,
	isEventIncoming,
	isSubscriptionIncoming,
	isWebhookIncoming,
	SkillConfiguration,
	SubscriptionIncoming,
	WebhookIncoming,
	workspaceId,
} from "./payload";
import { createProjectLoader } from "./project/loader";
import { commandRequestParameterPromptFactory } from "./prompt/prompt";
import { DefaultCredentialProvider } from "./secret/provider";
import { createStorageProvider } from "./storage/provider";
import { extractParameters, handleError, toArray } from "./util";

export type ContextFactory = (
	payload:
		| CommandIncoming
		| EventIncoming
		| WebhookIncoming
		| SubscriptionIncoming,
	ctx: { eventId: string },
) =>
	| ((CommandContext | EventContext | WebhookContext) & ContextualLifecycle)
	| undefined;

export function createContext(
	payload:
		| CommandIncoming
		| EventIncoming
		| WebhookIncoming
		| SubscriptionIncoming,
	ctx: { eventId: string },
):
	| ((CommandContext | EventContext | WebhookContext) & ContextualLifecycle)
	| undefined {
	const apiKey = payload?.secrets?.find(s => s.uri === "atomist://api-key")
		?.value;
	const wid = workspaceId(payload);
	const graphql = createGraphQLClient(apiKey, wid);
	const storage = createStorageProvider(wid);
	const credential = new DefaultCredentialProvider(graphql, payload);
	const completeCallbacks = [];
	const onComplete = closable => {
		completeCallbacks.push(closable);
	};
	const close = async () => {
		let callback = completeCallbacks.pop();
		while (callback) {
			await handleError(callback);
			callback = completeCallbacks.pop();
		}
	};

	if (isCommandIncoming(payload)) {
		if (payload.raw_message) {
			const parameters = extractParameters(payload.raw_message);
			payload.parameters.push(...parameters);
		}
		const message = new PubSubCommandMessageClient(payload, graphql);
		return {
			parameters: {
				prompt: commandRequestParameterPromptFactory(message, payload),
			},
			name: payload.command,
			correlationId: payload.correlation_id,
			executionId: ctx.eventId,
			workspaceId: wid,
			credential,
			graphql,
			http: createHttpClient(),
			audit: createAuditLogger(
				{
					skillId: payload.skill.id,
					eventId: ctx.eventId,
					correlationId: payload.correlation_id,
					workspaceId: wid,
				},
				{
					name: payload.command,
					skill: `${payload.skill.namespace}/${payload.skill.name}@${payload.skill.version}`,
				},
				onComplete,
			),
			storage,
			message,
			datalog: createDatalogClient(
				apiKey,
				wid,
				payload.correlation_id,
				payload.skill,
			),
			project: createProjectLoader({ onComplete }),
			trigger: payload,
			...extractConfiguration(payload),
			skill: payload.skill,
			close,
			onComplete,
		};
	} else if (isEventIncoming(payload)) {
		return {
			data: payload.data,
			name: payload.extensions.operationName,
			correlationId: payload.extensions.correlation_id,
			executionId: ctx.eventId,
			workspaceId: wid,
			credential,
			graphql,
			http: createHttpClient(),
			audit: createAuditLogger(
				{
					skillId: payload.skill.id,
					eventId: ctx.eventId,
					correlationId: payload.extensions.correlation_id,
					workspaceId: wid,
				},
				{
					name: payload.extensions.operationName,
					skill: `${payload.skill.namespace}/${payload.skill.name}@${payload.skill.version}`,
				},
				onComplete,
			),
			storage,
			message: new PubSubEventMessageClient(
				payload,
				graphql,
				payload.extensions.team_id,
				payload.extensions.team_name,
				payload.extensions.operationName,
				payload.extensions.correlation_id,
			),
			datalog: createDatalogClient(
				apiKey,
				wid,
				payload.extensions.correlation_id,
				payload.skill,
			),
			project: createProjectLoader({ onComplete }),
			trigger: payload,
			configuration: extractConfiguration(payload)?.configuration?.[0],
			skill: payload.skill,
			close,
			onComplete,
		};
	} else if (isSubscriptionIncoming(payload)) {
		return {
			data: toArray(payload.subscription?.result).map(mapSubscription),
			name: payload.subscription?.name,
			correlationId: payload.correlation_id,
			executionId: ctx.eventId,
			workspaceId: wid,
			credential,
			graphql,
			http: createHttpClient(),
			audit: createAuditLogger(
				{
					skillId: payload.skill.id,
					eventId: ctx.eventId,
					correlationId: payload.correlation_id,
					workspaceId: wid,
				},
				{
					name: payload.subscription?.name,
					skill: `${payload.skill.namespace}/${payload.skill.name}@${payload.skill.version}`,
				},
				onComplete,
			),
			storage,
			message: new PubSubEventMessageClient(
				payload,
				graphql,
				payload.team_id,
				payload.team_id,
				payload.subscription?.name,
				payload.correlation_id,
			),
			datalog: createDatalogClient(
				apiKey,
				wid,
				payload.correlation_id,
				payload.skill,
			),
			project: createProjectLoader({ onComplete }),
			trigger: payload,
			configuration: extractConfiguration(payload)?.configuration?.[0],
			skill: payload.skill,
			close,
			onComplete,
		};
	} else if (isWebhookIncoming(payload)) {
		return {
			name: payload.webhook.parameter_name,
			body: payload.webhook.body,
			get json() {
				return JSON.parse((payload as any).webhook.body);
			},
			headers: payload.webhook.headers,
			url: payload.webhook.url,
			correlationId: payload.correlation_id,
			executionId: ctx.eventId,
			workspaceId: wid,
			credential,
			graphql,
			http: createHttpClient(),
			audit: createAuditLogger(
				{
					skillId: payload.skill.id,
					eventId: ctx.eventId,
					correlationId: payload.correlation_id,
					workspaceId: wid,
				},
				{
					name: payload.webhook.parameter_name,
					skill: `${payload.skill.namespace}/${payload.skill.name}@${payload.skill.version}`,
				},
				onComplete,
			),
			storage,
			message: new PubSubWebhookMessageClient(payload, graphql),
			datalog: createDatalogClient(
				apiKey,
				wid,
				payload.correlation_id,
				payload.skill,
			),
			project: createProjectLoader(),
			trigger: payload,
			configuration: extractConfiguration(payload)?.configuration?.[0],
			skill: payload.skill,
			close,
			onComplete,
		};
	}
	return undefined;
}

export function extractConfiguration(
	payload:
		| CommandIncoming
		| EventIncoming
		| WebhookIncoming
		| SubscriptionIncoming,
): { configuration: Array<Configuration<any>> } {
	const cfgs: SkillConfiguration[] = [];
	if ((payload.skill?.configuration as any)?.instances) {
		cfgs.push(...(payload.skill.configuration as any).instances);
	} else if (payload.skill?.configuration) {
		cfgs.push(payload.skill.configuration as SkillConfiguration);
	}
	return {
		configuration: cfgs.map(c => ({
			name: c.name,
			parameters: extractConfigurationParameters(c.parameters),
			resourceProviders: extractConfigurationResourceProviders(
				c.resourceProviders,
			),
			url: `https://go.atomist.com/${workspaceId(
				payload,
			)}/manage/skills/configure/edit/${payload.skill.namespace}/${
				payload.skill.name
			}/${encodeURIComponent(c.name)}`,
		})),
	};
}

function extractConfigurationParameters(
	params: Array<{ name: string; value: any }>,
): Record<string, any> {
	const parameters = {};
	params?.forEach(p => (parameters[p.name] = p.value));
	return parameters;
}

function extractConfigurationResourceProviders(
	params: Array<{
		name: string;
		typeName: string;
		selectedResourceProviders: Array<{ id: string }>;
	}>,
): Configuration<any>["resourceProviders"] {
	const resourceProviders = {};
	params?.forEach(
		p =>
			(resourceProviders[p.name] = {
				typeName: p.typeName,
				selectedResourceProviders: p.selectedResourceProviders,
			}),
	);
	return resourceProviders;
}
