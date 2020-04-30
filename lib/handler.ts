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

import { Logger } from "@atomist/skill-logging/lib/logging";
import { GraphQLClient } from "./graphql";
import { HttpClient } from "./http";
import {
    CommandMessageClient,
    MessageClient,
} from "./message";
import {
    ParameterPromptOptions,
    ParametersPromptObject,
} from "./parameter_prompt";
import {
    CommandIncoming,
    EventIncoming,
} from "./payload";
import { ProjectLoader } from "./project";
import { CredentialProvider } from "./secrets";
import { StorageProvider } from "./storage";

export interface Configuration<C extends Record<string, any>> {
    name: string;
    parameters: C;
    resourceProviders: Record<string, { typeName: string; selectedResourceProviders: Array<{ id: string }> }>;
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
    audit: Logger;
    storage: StorageProvider;

    trigger: T;

    configuration: Array<Configuration<C>>;
    skill: {
        id: string;
        name: string;
        namespace: string;
        version: string;
    };
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

export interface HandlerStatus {
    visibility?: "hidden";
    code?: number;
    reason?: string;
}

export type CommandHandler<C = any> = (context: CommandContext<C>) => Promise<void | HandlerStatus>;

export type EventHandler<E = any, C = any> = (context: EventContext<E, C>) => Promise<void | HandlerStatus>;
