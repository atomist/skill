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

import { RemoteRepoRef } from "@atomist/automation-client/lib/operations/common/RepoId";
import { GitProject } from "@atomist/automation-client/lib/project/git/GitProject";
import { DirectoryManager } from "@atomist/automation-client/lib/spi/clone/DirectoryManager";
import {
    execPromise,
    ExecPromiseResult,
    spawnPromise,
    SpawnPromiseOptions,
    SpawnPromiseReturns,
} from "@atomist/automation-client/lib/util/child_process";
import { CloneDirectoryInfo } from "@atomist/automation-client/src/lib/spi/clone/DirectoryManager";
import { SpawnSyncOptions } from "child_process";
import * as fs from "fs-extra";
import { debug } from "./log";
import {
    GitHubAppCredential,
    GitHubCredential,
    isGitHubAppCredential,
    isGitHubCredential,
} from "./secrets";

export interface CloneOptions {

    /**
     * If this is true, the implementation should keep the directory at least
     * for the duration of the current process. If it's false, persistence can be treated
     * in any way.
     */
    keep?: boolean;

    /**
     * If this is true, always make a full clone.
     * If it's false, and we want the master branch, and we're cloning into a transient
     * place, then clone with `--depth 1` to save time.
     */
    alwaysDeep?: boolean;

    /**
     * If we are not doing a deep clone (alwaysDeep is false),
     * then the default is to clone only one branch.
     * Set noSingleBranch to true to clone the tips of all branches instead.
     * This passes `--no-single-branch` to `git clone`.
     * If alwaysDeep is true, this option has no effect.
     */
    noSingleBranch?: boolean;

    /**
     * Set this to the number of commits that should be cloned into the transient
     * place. This only applies when alwaysDeep is set to false.
     */
    depth?: number;

    /**
     * If you really want the SHA, not the tip of the branch that we've checked out,
     * then request a detached HEAD at that SHA.
     */
    detachHead?: boolean;

    /**
     * Path to clone into
     */
    path?: string;
}

export function gitHubComRepository(details: {
    owner: string,
    repo: string,
    branch?: string,
    sha?: string,
    credential: GitHubCredential | GitHubAppCredential,
}): AuthenticatedRepositoryId<GitHubCredential | GitHubAppCredential> {
    return {
        ...details,
        type: RepositoryProviderType.GitHubCom,
    };
}

export enum RepositoryProviderType {
    GitHubCom,
    GitHubEnterprise,
}

export interface RepositoryId {
    owner: string;
    repo: string;

    branch?: string;
    sha?: string;

    type: RepositoryProviderType;
    apiUrl?: string;
}

export interface AuthenticatedRepositoryId<T> extends RepositoryId {
    credential: T;
}

export type Spawn = (cmd: string, args?: string[], opts?: SpawnPromiseOptions) => Promise<SpawnPromiseReturns>;
export type Exec = (cmd: string, args?: string[], opts?: SpawnSyncOptions) => Promise<ExecPromiseResult>;

export type Project = GitProject & { spawn: Spawn, exec: Exec };

export interface ProjectLoader {

    load(id: AuthenticatedRepositoryId<any>, baseDir: string): Promise<Project | undefined>;

    clone(id: AuthenticatedRepositoryId<any>, options?: CloneOptions): Promise<Project | undefined>;

}

export class DefaultProjectLoader implements ProjectLoader {

    public async load(id: AuthenticatedRepositoryId<any>, baseDir: string): Promise<Project | undefined> {
        if (isGitHubCredential(id.credential) || isGitHubAppCredential(id.credential)) {
            const gcgp = await import("@atomist/automation-client/lib/project/git/GitCommandGitProject");
            const project = await gcgp.GitCommandGitProject.fromBaseDir(
                await convertToRepoRef(id),
                baseDir,
                { token: id.credential.token },
                async () => {
                });
            (project as any).spawn = (cmd, args, opts) => spawnPromise(cmd, args, { log: { write: debug }, cwd: project.baseDir, ...(opts || {}) });
            (project as any).exec = (cmd, args, opts) => execPromise(cmd, args, { log: { write: debug }, cwd: project.baseDir, ...(opts || {}) });
            await project.setUserConfig("Atomist Bot", "bot@atomist.com");
            return project as any;
        }
        return undefined;
    }

    public async clone(id: AuthenticatedRepositoryId<any>, options?: CloneOptions): Promise<Project> {
        if (isGitHubCredential(id.credential) || isGitHubAppCredential(id.credential)) {
            const gcgp = await import("@atomist/automation-client/lib/project/git/GitCommandGitProject");
            const project = await gcgp.GitCommandGitProject.cloned(
                { token: id.credential.token },
                await convertToRepoRef(id),
                options,
                options?.path ? new FixedPathDirectoryManager(options.path) : undefined,
            );
            (project as any).spawn = (cmd, args, opts) => spawnPromise(cmd, args, { log: { write: debug }, cwd: project.baseDir, ...(opts || {}) });
            (project as any).exec = (cmd, args, opts) => execPromise(cmd, args, { log: { write: debug }, cwd: project.baseDir, ...(opts || {}) });
            await project.setUserConfig("Atomist Bot", "bot@atomist.com");
            return project as any;
        }
        return undefined;
    }
}

async function convertToRepoRef(id: AuthenticatedRepositoryId<any>): Promise<RemoteRepoRef> {
    switch (id.type) {
        case RepositoryProviderType.GitHubCom:
        case RepositoryProviderType.GitHubEnterprise:
            const grr = await import("@atomist/automation-client/lib/operations/common/GitHubRepoRef");
            return grr.GitHubRepoRef.from({
                owner: id.owner,
                repo: id.repo,
                sha: id.sha,
                branch: id.branch,
                rawApiBase: id.apiUrl,
            });
        default:
            throw new Error("Unsupported repository id");
    }
}

class FixedPathDirectoryManager implements DirectoryManager {

    constructor(private readonly path: string) {
    }

    public async directoryFor(owner: string, repo: string, branch: string, opts: CloneOptions): Promise<CloneDirectoryInfo> {
        await fs.ensureDir(this.path);
        return {
            path: this.path,
            transient: false,
            type: "empty-directory",
            provenance: "skill-runner",
            release: async () => {
            },
            invalidate: async () => {
            },
        };
    }
}
