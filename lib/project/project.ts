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

import { SpawnSyncOptions } from "child_process";
import * as path from "path";
import {
    execPromise,
    ExecPromiseResult,
    spawnPromise,
    SpawnPromiseOptions,
    SpawnPromiseReturns,
} from "../child_process";
import { debug } from "../log";
import { AuthenticatedRepositoryId } from "../repository/id";
import { CloneOptions, doClone } from "./clone";
import { setUserConfig } from "../git";

export type Spawn = (cmd: string, args?: string[], opts?: SpawnPromiseOptions) => Promise<SpawnPromiseReturns>;
export type Exec = (cmd: string, args?: string[], opts?: SpawnSyncOptions) => Promise<ExecPromiseResult>;

export interface Project<C = any> {
    id: AuthenticatedRepositoryId<C>;

    path(...elements: string[]): string;

    spawn: Spawn;
    exec: Exec;
}

export async function load<C>(id: AuthenticatedRepositoryId<C>, baseDir: string): Promise<Project<C>> {
    const project = {
        id,
        path: (...elements: string[]): string => path.join(baseDir, ...(elements || [])),
        spawn: (cmd, args, opts): Promise<SpawnPromiseReturns> =>
            spawnPromise(cmd, args, { log, cwd: baseDir, ...(opts || {}) }),
        exec: (cmd, args, opts): Promise<ExecPromiseResult> =>
            execPromise(cmd, args, { cwd: baseDir, ...(opts || {}) }),
    };
    await setUserConfig(project);
    return project;
}

export async function clone<C>(id: AuthenticatedRepositoryId<C>, options?: CloneOptions): Promise<Project<C>> {
    const baseDir = await doClone(id, options);
    const project = {
        id,
        path: (...elements: string[]): string => path.join(baseDir, ...(elements || [])),
        spawn: (cmd, args, opts): Promise<SpawnPromiseReturns> =>
            spawnPromise(cmd, args, { log, cwd: baseDir, ...(opts || {}) }),
        exec: (cmd, args, opts): Promise<ExecPromiseResult> =>
            execPromise(cmd, args, { cwd: baseDir, ...(opts || {}) }),
    };
    await setUserConfig(project);
    return project;
}

const log = {
    write: (msg): void => {
        let line = msg;
        if (line.endsWith("\n")) {
            line = line.slice(0, -1);
        }
        const lines = line.split("\n");
        lines.forEach(l => debug(l.trimRight()));
    },
};
