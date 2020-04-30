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

import {
    clone,
    load,
    Project,
} from "./project/project";
import {
    GitHubAppCredential,
    GitHubCredential,
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
    owner: string;
    repo: string;
    branch?: string;
    sha?: string;
    credential: GitHubCredential | GitHubAppCredential;
}): AuthenticatedRepositoryId<GitHubCredential | GitHubAppCredential> {
    return {
        ...details,
        type: RepositoryProviderType.GitHubCom,
        cloneUrl: (): string => {
            if (details.credential) {
                // GitHub App tokens start with v1. and are expected in the password field
                if (details.credential.token.startsWith("v1.")) {
                    return `https://atomist:${details.credential.token}@github.com/${details.owner}/${details.repo}.git`;
                } else {
                    return `https://${details.credential.token}:x-oauth-basic@github.com/${details.owner}/${details.repo}.git`;
                }
            } else {
                return `https://github.com/${details.owner}/${details.repo}.git`;
            }
        },
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
    gitUrl?: string;
}

export interface AuthenticatedRepositoryId<T> extends RepositoryId {
    credential: T;

    cloneUrl(): string;
}

export interface ProjectLoader {

    load(id: AuthenticatedRepositoryId<any>, baseDir: string): Promise<Project>;

    clone(id: AuthenticatedRepositoryId<any>, options?: CloneOptions): Promise<Project>;

}

export function createProjectLoader(): ProjectLoader {
    return new DefaultProjectLoader();
}

export class DefaultProjectLoader implements ProjectLoader {

    public async load(id: AuthenticatedRepositoryId<any>, baseDir: string): Promise<Project> {
        return load(id, baseDir);
    }

    public async clone(id: AuthenticatedRepositoryId<any>, options?: CloneOptions): Promise<Project> {
        return clone(id, options);
    }
}
