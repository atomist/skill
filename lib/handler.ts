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

import { GraphQLClient } from "./graphql";
import { HttpClient } from "./http";
import {
    CommandMessageClient,
    MessageClient,
} from "./message";
import {
    ParameterPromptOptions,
    ParametersPromptObject,
} from "./parameterPrompt";
import {
    CommandIncoming,
    EventIncoming,
} from "./payload";
import { ProjectLoader } from "./project";
import { CredentialProvider } from "./secrets";

export interface Configuration {
    name: string;
    parameters: Record<any, string>;
}

export interface Contextual<T> {

    name: string;
    workspaceId: string;
    correlationId: string;

    credential: CredentialProvider;
    graphql: GraphQLClient;
    http: HttpClient;
    message: MessageClient;
    project: ProjectLoader;

    trigger: T;
}

export interface EventContext<E = any> extends Contextual<EventIncoming> {
    data: E;
}

export interface CommandContext extends Contextual<CommandIncoming> {

    parameters: {
        prompt<PARAMS = any>(parameters: ParametersPromptObject<PARAMS>, options?: ParameterPromptOptions): Promise<PARAMS>;
    };

    credential: CredentialProvider;
    graphql: GraphQLClient;
    http: HttpClient;
    message: CommandMessageClient;
}

export type CommandHandler = (context: CommandContext) => Promise<void>;

export type EventHandler<E = any> = (context: EventContext<E>) => Promise<void>;
