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

import * as os from "os";
import * as pRetry from "p-retry";
import * as path from "path";
import { execPromise } from "../child_process";
import { debug } from "../log";
import {
    AuthenticatedRepositoryId,
    CloneOptions,
} from "../project";
import { guid } from "../util";

export async function doClone(id: AuthenticatedRepositoryId<any>,
                              options: CloneOptions = {}): Promise<string> {
    debug(
        `Cloning repository '${id.owner}/${id.repo}', branch '${id.branch}', sha '${id.sha}' and options '${JSON.stringify(options)}'`);
    const sha = id.sha || "HEAD";
    const repoDir = options.path || path.join(os.tmpdir(), guid());
    const url = id.cloneUrl();
    const cloneBranch = id.branch;
    const cloneArgs = ["clone", url, repoDir];

    // If we wanted a deep clone, just clone it
    if (!options.alwaysDeep) {
        // If we didn't ask for a deep clone, then default to cloning only the tip of the default branch.
        // the cloneOptions let us ask for more commits than that
        cloneArgs.push("--depth", ((options.depth && options.depth > 0) ? options.depth : 1).toString(10));
        if (cloneBranch) {
            // if not cloning deeply, be sure we clone the right branch
            cloneArgs.push("--branch", cloneBranch);
        }
        if (options.noSingleBranch) {
            cloneArgs.push("--no-single-branch");
        }
    }
    // Note: branch takes preference for checkout because we might be about to commit to it.
    // If you want to be sure to land on your SHA, set opts.detachHead to true.
    // Or don't, but then call gitStatus() on the returned project to check whether the branch is still at the SHA you wanted.
    const checkoutRef = options.detachHead ? sha : id.branch || sha;

    const retryOptions = {
        retries: 4,
        factor: 2,
        minTimeout: 100,
        maxTimeout: 500,
        randomize: false,
    };
    await pRetry( () => execPromise("git", cloneArgs), retryOptions);
    
    try {
        await execPromise("git", ["checkout", checkoutRef, "--"], { cwd: repoDir });
    } catch (err) {
        // When the head moved on and we only cloned with depth; we might have to do a full clone to get to the commit we want
        debug(`Ref ${checkoutRef} not in cloned history. Attempting full clone`);
        await execPromise("git", ["fetch", "--unshallow"], { cwd: repoDir });
        await execPromise("git", ["checkout", checkoutRef, "--"], { cwd: repoDir });
    }
    return repoDir;
}
