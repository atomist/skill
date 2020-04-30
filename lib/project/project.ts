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
import {
    AuthenticatedRepositoryId,
    CloneOptions,
} from "../project";
import { doClone } from "./clone";

export type Spawn = (cmd: string, args?: string[], opts?: SpawnPromiseOptions) => Promise<SpawnPromiseReturns>;
export type Exec = (cmd: string, args?: string[], opts?: SpawnSyncOptions) => Promise<ExecPromiseResult>;

export interface Project {

    path(...elements: string[]): string;

    spawn: Spawn;
    exec: Exec;
}

export async function load(id: AuthenticatedRepositoryId<any>, baseDir: string): Promise<Project> {
    const project = {
        path: (...elements: string[]): string => path.join(baseDir, ...(elements || [])),
        spawn: (cmd, args, opts): Promise<SpawnPromiseReturns> => spawnPromise(cmd, args, { log, cwd: baseDir, ...(opts || {}) }),
        exec: (cmd, args, opts): Promise<ExecPromiseResult> => execPromise(cmd, args, { cwd: baseDir, ...(opts || {}) }),
    };
    await setUserConfig(project);
    return project;
}

export async function clone(id: AuthenticatedRepositoryId<any>, options?: CloneOptions): Promise<Project> {
    const baseDir = await doClone(id, options);
    const project = {
        path: (...elements: string[]): string => path.join(baseDir, ...(elements || [])),
        spawn: (cmd, args, opts): Promise<SpawnPromiseReturns> => spawnPromise(cmd, args, { log, cwd: baseDir, ...(opts || {}) }),
        exec: (cmd, args, opts): Promise<ExecPromiseResult> => execPromise(cmd, args, { cwd: baseDir, ...(opts || {}) }),
    };
    await setUserConfig(project);
    return project;
}

async function setUserConfig(project: Project): Promise<void> {
    await project.exec("git", ["config", "user.name", "Atomist Bot"]);
    await project.exec("git", ["config", "user.email", "bot@atomist.com"]);
}

const log = {
    write: (msg): void => {
        let line = msg;
        if (line.endsWith("\n")) {
            line = line.slice(0, -2);
        }
        const lines = line.split("\n");
        lines.forEach(l => debug(l.trimRight()));
    },
};
