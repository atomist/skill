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

import * as _ from "lodash";
import { NodeFetchGraphQLClient } from "./graphql";
import {
    CommandContext,
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

export function createContext(payload: CommandIncoming | EventIncoming): EventContext | CommandContext {
    const apiKey = payload?.secrets?.find(s => s.uri === "atomist://api-key")?.value;
    const wid = workspaceId(payload);
    const graphql = new NodeFetchGraphQLClient(apiKey, `${process.env.GRAPHQL_ENDPOINT}/team/${wid}`);
    const credential = new DefaultCredentialProvider(graphql, payload);
    if (isCommandIncoming(payload)) {
        // TODO cd does this have to be here?
        if (!!payload.raw_message) {
            const parameters = require("yargs-parser")(payload.raw_message);
            _.forEach(parameters, (v, k) => {
                if (k !== "_") {
                    payload.parameters.push({ name: k, value: v});
                }
            });
        }
        const message = new PubSubCommandMessageClient(payload, graphql);
        return {
            parameters: {
                prompt: commandRequestParameterPromptFactory(message, payload),
            },
            name: payload.command,
            correlationId: payload.correlation_id,
            workspaceId: wid,
            credential,
            graphql,
            http: new NodeFetchHttpClient(),
            message,
            project: new DefaultProjectLoader(),
            trigger: payload,
        };
    } else if (isEventIncoming(payload)) {
        return {
            data: payload.data,
            name: payload.extensions.operationName,
            correlationId: payload.extensions.correlation_id,
            workspaceId: wid,
            credential,
            graphql,
            http: new NodeFetchHttpClient(),
            message: new PubSubEventMessageClient(payload, graphql),
            project: new DefaultProjectLoader(),
            trigger: payload,
        };
    }
    return undefined;
}
