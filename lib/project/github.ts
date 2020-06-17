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

import { Octokit } from "@octokit/rest"; // eslint-disable-line @typescript-eslint/no-unused-vars
import { Contextual } from "../handler";
import { AuthenticatedRepositoryId } from "../project";
import {
    GitHubAppCredential,
    GitHubCredential,
} from "../secrets";

const DefaultGitHubApiUrl = "https://api.github.com/";

export function gitHub(id: Pick<AuthenticatedRepositoryId<GitHubCredential | GitHubAppCredential>, "credential" | "apiUrl">): Octokit {
    const url = id.apiUrl || DefaultGitHubApiUrl;

    const { Octokit } = require("@octokit/rest"); // eslint-disable-line @typescript-eslint/no-var-requires
    const { throttling }= require("@octokit/plugin-throttling"); // eslint-disable-line @typescript-eslint/no-var-requires
    const { retry } = require("@octokit/plugin-retry"); // eslint-disable-line @typescript-eslint/no-var-requires
    const ConfiguredOctokit = Octokit.plugin(throttling, retry);

    return new ConfiguredOctokit({
        auth: `token ${id.credential.token}`,
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

export function formatMarkers(ctx: Contextual<any, any>, ...tags: string[]): string {
    return `
---

<details>
  <summary>Tags</summary>
  <br/>
  <code>[atomist:generated]</code>
  <br/>
  <code>[atomist-skill:${ctx.skill.namespace}/${ctx.skill.name}]</code>
  <br/>
  <code>[atomist-correlation-id:${ctx.correlationId}]</code>
  ${tags.map(t => `<br/>
  <code>[t]</code>`).join("\n")}
</details>`;
}
