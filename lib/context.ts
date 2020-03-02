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
import { NodeFetchGraphQLClient } from "./graphql";
import {
    CommandContext,
    Configuration,
    EventContext,
} from "./handler";
import { NodeFetchHttpClient } from "./http";
import {
    PubSubCommandMessageClient,
    PubSubEventMessageClient,
} from "./message";
import { commandRequestParameterPromptFactory } from "./parameterPrompt";
import {
    CommandIncoming,
    EventIncoming,
    isCommandIncoming,
    isEventIncoming,
    workspaceId,
} from "./payload";
import { DefaultProjectLoader } from "./project";
import { DefaultCredentialProvider } from "./secrets";
import { extractParameters } from "./util";

export function createContext(payload: CommandIncoming | EventIncoming, ctx: { eventId: string }): EventContext | CommandContext {
    const apiKey = payload?.secrets?.find(s => s.uri === "atomist://api-key")?.value;
    const wid = workspaceId(payload);
    const graphql = new NodeFetchGraphQLClient(apiKey, `${process.env.GRAPHQL_ENDPOINT || "https://automation.atomist.com/graphql"}/team/${wid}`);
    const credential = new DefaultCredentialProvider(graphql, payload);
    if (isCommandIncoming(payload)) {
        if (!!payload.raw_message) {
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
            http: new NodeFetchHttpClient(),
            audit: createLogger({
                eventId: ctx.eventId,
                correlationId: payload.correlation_id,
                workspaceId: wid,
            }, {
                name: payload.command,
            }),
            message,
            project: new DefaultProjectLoader(),
            trigger: payload,
            ...extractConfiguration(payload),
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
            http: new NodeFetchHttpClient(),
            audit: createLogger({
                eventId: ctx.eventId,
                correlationId: payload.extensions.correlation_id,
                workspaceId: wid,
            }, {
                name: payload.extensions.operationName,
            }),
            message: new PubSubEventMessageClient(payload, graphql),
            project: new DefaultProjectLoader(),
            trigger: payload,
            ...extractConfiguration(payload),
        };
    }
    return undefined;
}

function extractConfiguration(payload: CommandIncoming | EventIncoming):
    { configuration: Configuration<any>, configurations: Array<Configuration<any>> } {
    return {
        configuration: {
            name: payload.configuration?.name,
            parameters: extractConfigurationParameters(payload.configuration?.parameters),
        },
        configurations: payload?.configurations?.map(c => ({
            name: c.name,
            parameters: extractConfigurationParameters(c.parameters),
        })),
    };
}

function extractConfigurationParameters(params: Array<{ name: string, value: any }>): Record<string, any> {
    const parameters = {};
    params?.forEach(p => parameters[p.name] = p.value);
    return parameters;
}
