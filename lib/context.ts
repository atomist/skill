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

import { createLogger } from "@atomist/skill-logging/lib/logging";
import { createGraphQLClient } from "./graphql";
import {
    CommandContext,
    Configuration,
    EventContext,
} from "./handler";
import { createHttpClient } from "./http";
import {
    PubSubCommandMessageClient,
    PubSubEventMessageClient,
} from "./message";
import { commandRequestParameterPromptFactory } from "./parameter_prompt";
import {
    CommandIncoming,
    EventIncoming,
    isCommandIncoming,
    isEventIncoming,
    workspaceId,
} from "./payload";
import { createProjectLoader } from "./project";
import { DefaultCredentialProvider } from "./secrets";
import { createStorageProvider } from "./storage";
import { extractParameters } from "./util";

export function createContext(payload: CommandIncoming | EventIncoming,
                              ctx: { eventId: string }): EventContext | CommandContext {
    const apiKey = payload?.secrets?.find(s => s.uri === "atomist://api-key")?.value;
    const wid = workspaceId(payload);
    const graphql = createGraphQLClient(apiKey, wid);
    const storage = createStorageProvider();
    const credential = new DefaultCredentialProvider(graphql, payload);
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
            audit: createLogger({
                eventId: ctx.eventId,
                correlationId: payload.correlation_id,
                workspaceId: wid,
            }, {
                name: payload.command,
            }),
            storage,
            message,
            project: createProjectLoader(),
            trigger: payload,
            ...extractConfiguration(payload),
            skill: payload.skill,
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
            audit: createLogger({
                eventId: ctx.eventId,
                correlationId: payload.extensions.correlation_id,
                workspaceId: wid,
            }, {
                name: payload.extensions.operationName,
            }),
            storage,
            message: new PubSubEventMessageClient(payload, graphql),
            project: createProjectLoader(),
            trigger: payload,
            ...extractConfiguration(payload),
            skill: payload.skill,
        };
    }
    return undefined;
}

function extractConfiguration(payload: CommandIncoming | EventIncoming):
    { configuration: Array<Configuration<any>> } {
    return {
        configuration: payload.skill?.configuration?.instances?.map(c => ({
            name: c.name,
            parameters: extractConfigurationParameters(c.parameters),
            resourceProviders: extractConfigurationResourceProviders(c.resourceProviders),
        })),
    };
}

function extractConfigurationParameters(params: Array<{ name: string; value: any }>): Record<string, any> {
    const parameters = {};
    params?.forEach(p => parameters[p.name] = p.value);
    return parameters;
}

function extractConfigurationResourceProviders(params: Array<{
    name: string;
    typeName: string;
    selectedResourceProviders: Array<{ id: string }>;
}>): Configuration<any>["resourceProviders"] {
    const resourceProviders = {};
    params?.forEach(p => resourceProviders[p.name] = { typeName: p.typeName, selectedResourceProviders: p.selectedResourceProviders });
    return resourceProviders;
}
