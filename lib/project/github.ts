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

import { Octokit } from "@octokit/rest";
import { RepositoryId } from "../project";
import {
    GitHubAppCredential,
    GitHubCredential,
} from "../secrets";


const DefaultGitHubApiUrl = "https://api.github.com/";

export function gitHub(credential: GitHubCredential | GitHubAppCredential,
                       id: RepositoryId): Octokit {
    const url = id.apiUrl || DefaultGitHubApiUrl;

    const github = require("@octokit/rest");
    const throttling = require("@octokit/plugin-throttling");
    const retry = require("@octokit/plugin-retry");
    const ConfiguredOctokit = github.Octokit.plugin(throttling, retry);

    return new ConfiguredOctokit({
        auth: `token ${credential.token}`,
        baseUrl: url.endsWith("/") ? url.slice(0, -1) : url,
        throttle: {
            onRateLimit: (retryAfter: any, options: any): boolean => {
                console.warn(`Request quota exhausted for request '${options.method} ${options.url}'`);

                if (options.request.retryCount === 0) { // only retries once
                    console.debug(`Retrying after ${retryAfter} seconds!`);
                    return true;
                }
                return false;
            },
            onAbuseLimit: (retryAfter: any, options: any): void => {
                console.warn(`Abuse detected for request '${options.method} ${options.url}'`);
            },
        },
    });
}
