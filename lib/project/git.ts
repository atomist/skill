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

import * as pRetry from "p-retry";
import { execPromise } from "../child_process";
import { debug } from "../log";
import { GitStatus, runStatusIn } from "./gitStatus";
import { Project } from "./project";
import { cwd } from "./util";
import forOwn = require("lodash.forown");

/**
 * Git push options.  See git-push(1) for more information.
 */
export interface GitPushOptions {
    follow_tags?: boolean;
    force?: boolean;
    force_with_lease?: boolean | string;
    quiet?: boolean;
    verbose?: boolean;

    branch?: string;
}

/**
 * Init a new Git repository
 */
export async function init(projectOrCwd: Project | string): Promise<void> {
    await execPromise("git", ["init"], { cwd: cwd(projectOrCwd) });
}

/**
 * Return status information about a Git repository
 */
export async function status(projectOrCwd: Project | string): Promise<GitStatus> {
    return runStatusIn(cwd(projectOrCwd));
}

/**
 * `git add .` and `git commit -m MESSAGE`
 */
export async function commit(
    projectOrCwd: Project | string,
    message: string,
    options: { name?: string; email?: string } = {},
): Promise<void> {
    await execPromise("git", ["add", "."], { cwd: cwd(projectOrCwd) });
    await execPromise("git", ["commit", "-m", message], { cwd: cwd(projectOrCwd) });
    if (options.name && options.email) {
        await execPromise("git", ["commit", "--amend", `--author="${options.name} <${options.email}>"`, "--no-edit"], {
            cwd: cwd(projectOrCwd),
        });
    }
}

/**
 * Check out a particular commit. We'll end in detached head state
 */
export async function checkout(projectOrCwd: Project | string, ref: string): Promise<void> {
    await execPromise("git", ["checkout", ref, "--"], { cwd: cwd(projectOrCwd) });
}

/**
 * Revert all changes since last commit
 */
export async function revert(projectOrCwd: Project | string): Promise<void> {
    await execPromise("git", ["clean", "-dfx"], { cwd: cwd(projectOrCwd) });
    await execPromise("git", ["checkout", "--", "."], { cwd: cwd(projectOrCwd) });
}

/**
 * Push all changes to the remote
 */
export async function push(projectOrCwd: Project | string, options?: GitPushOptions): Promise<void> {
    const gitPushArgs = ["push"];
    const branch = options?.branch;

    forOwn(options, (v, k) => {
        if (k !== "branch") {
            const opt = k.replace(/_/g, "-");
            if (typeof v === "boolean") {
                if (v === false) {
                    gitPushArgs.push(`--no-${opt}`);
                } else {
                    gitPushArgs.push(`--${opt}`);
                }
            } else if (typeof v === "string") {
                gitPushArgs.push(`--${opt}=${v}`);
            }
        }
    });

    if (branch) {
        gitPushArgs.push("--set-upstream", "origin", branch);
    } else {
        gitPushArgs.push("origin");
    }

    const retryOptions = {
        retries: 4,
        factor: 2,
        minTimeout: 250,
        maxTimeout: 1000,
        randomize: false,
    };
    await pRetry(async () => {
        try {
            await execPromise("git", gitPushArgs, { cwd: cwd(projectOrCwd) });
        } catch (e) {
            debug("Push failed. Attempting rebase");
            await execPromise("git", ["pull", "--rebase"], { cwd: cwd(projectOrCwd) });
            await execPromise("git", gitPushArgs, { cwd: cwd(projectOrCwd) });
        }
    }, retryOptions);
}

/**
 * Create branch from current HEAD
 */
export async function createBranch(projectOrCwd: Project | string, name: string): Promise<void> {
    await execPromise("git", ["branch", name], { cwd: cwd(projectOrCwd) });
    await execPromise("git", ["checkout", name, "--"], { cwd: cwd(projectOrCwd) });
}

/**
 * Check if a branch exists
 */
export async function hasBranch(projectOrCwd: Project | string, name: string): Promise<boolean> {
    const result = await execPromise("git", ["branch", "--list", name]);
    return result.stdout.includes(name);
}

export async function setUserConfig(project: Project, name = "Atomist Bot", email = "bot@atomist.com"): Promise<void> {
    await project.exec("git", ["config", "user.name", name]);
    await project.exec("git", ["config", "user.email", email]);
}
