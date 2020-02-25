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

export interface Configuration<C extends Record<string, any>> {
    name: string;
    parameters: C;
}

export interface Contextual<T, C> {

    name: string;
    workspaceId: string;
    correlationId: string;
    executionId: string;

    credential: CredentialProvider;
    graphql: GraphQLClient;
    http: HttpClient;
    message: MessageClient;
    project: ProjectLoader;

    trigger: T;

    configuration: Configuration<C>;
    configurations: Array<Configuration<C>>;
}

export interface EventContext<E = any, C = any> extends Contextual<EventIncoming, C> {
    data: E;
}

export interface CommandContext<C = any> extends Contextual<CommandIncoming, C> {

    parameters: {
        prompt<PARAMS = any>(parameters: ParametersPromptObject<PARAMS>, options?: ParameterPromptOptions): Promise<PARAMS>;
    };

    credential: CredentialProvider;
    graphql: GraphQLClient;
    http: HttpClient;
    message: CommandMessageClient;
}

export interface HandlerStatus { code: number; reason: string; }

export type CommandHandler<C = any> = (context: CommandContext<C>) => Promise<void | HandlerStatus>;

export type EventHandler<E = any, C = any> = (context: EventContext<E, C>) => Promise<void | HandlerStatus>;
