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

export function isCommandIncoming(event: any): event is CommandIncoming {
    return !!event.command;
}

export function isEventIncoming(event: any): event is EventIncoming {
    return !!event.data;
}

export function workspaceId(event: CommandIncoming | EventIncoming): string | undefined {
    if (isCommandIncoming(event)) {
        return event.team.id;
    } else if (isEventIncoming(event)) {
        return event.extensions.team_id;
    }
    return undefined;
}

/**
 * Extension to EventIncoming and CommandIncoming capturing
 * skill specific information
 */
export interface Skill {

    id: string;
    name: string;
    namespace: string;
    version: string;

    artifacts: Array<{
        name: string;
        image: string;
        command?: string[];
        args?: string[];
        env?: Array<{ name: string; value: string }>;
        workingDir?: string;
        // secrets?: ContainerSecrets;
        // input?: string[];
        // output?: CacheEntry[];
    }>;

    configuration: {
        instances: Array<{
            name: string;
            parameters: Array<{ name: string; value: any }>;
            resourceProviders: Array<{ name: string; typeName: string; selectedResourceProviders: Array<{ id: string }> }>;
        }>;
    };
}

export interface EventIncoming {

    data: any;
    extensions: Extensions;
    secrets: Secret[];
    skill: Skill;
}

export interface Extensions {

    team_id: string;
    team_name?: string;
    operationName: string;
    correlation_id: string;
}

export interface CommandIncoming {

    api_version?: string;
    correlation_id: string;
    command: string;
    team: Team;
    source: Source;
    parameters: Arg[];
    secrets: Secret[];
    raw_message: string;
    skill: Skill;
}

export interface Source {
    user_agent: "slack" | "web";
    slack?: {
        team: {
            id: string;
            name?: string;
        };
        channel?: {
            id: string;
            name?: string;
        };
        user?: {
            id: string;
            name?: string;
        };
        thread_ts?: string;
    };
    web?: {
        identity: {
            sub: string;
            pid: string;
        };
    };
    identity?: any;
}

export interface Team {

    id: string;
    name?: string;
}

export interface Arg {

    name: string;
    value: string;
}

export interface Secret {

    uri: string;
    value: string;
}
