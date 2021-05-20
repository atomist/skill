/*
 * Copyright © 2021 Atomist, Inc.
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

import { Contextual } from "../handler/handler";
import { debug } from "../log/console";
import { isSubscriptionIncoming } from "../payload";
import { AuthenticatedRepositoryId } from "../repository/id";
import { GitHubAppCredential, GitHubCredential } from "../secret/provider";
import { toArray } from "../util";
import { transactResponse } from "./transact";

const DefaultGitHubApiUrl = "https://api.github.com/";

export function api(
	id: Pick<
		AuthenticatedRepositoryId<GitHubCredential | GitHubAppCredential>,
		"credential" | "apiUrl"
	>,
	ctx?: Contextual<any, any>,
): Octokit {
	const url = id?.apiUrl || DefaultGitHubApiUrl;

	const { Octokit } = require("@octokit/rest"); // eslint-disable-line @typescript-eslint/no-var-requires
	const { throttling } = require("@octokit/plugin-throttling"); // eslint-disable-line @typescript-eslint/no-var-requires
	const { retry } = require("@octokit/plugin-retry"); // eslint-disable-line @typescript-eslint/no-var-requires
	const ConfiguredOctokit = Octokit.plugin(throttling, retry);

	const octokit = new ConfiguredOctokit({
		auth: id?.credential ? `token ${id.credential.token}` : undefined,
		baseUrl: url.endsWith("/") ? url.slice(0, -1) : url,
		throttle: {
			onRateLimit: (retryAfter: any, options: any): boolean => {
				console.warn(
					`Request quota exhausted for request '${options.method} ${options.url}'`,
				);

				if (options.request.retryCount === 0) {
					// only retries once
					console.debug(`Retrying after ${retryAfter} seconds!`);
					return true;
				}
				return false;
			},
			onAbuseLimit: (retryAfter: any, options: any): void => {
				console.warn(
					`Abuse detected for request '${options.method} ${options.url}'`,
				);
			},
		},
		log: {
			debug: debug,
			info: debug,
			warn: debug,
			error: debug,
		},
	});

	if (ctx) {
		// Add hook to transact GitHub entities to Datalog
		octokit.hook.after("request", async (response, options) => {
			await transactResponse(response, options, ctx, octokit);
		});
	}
	return octokit;
}

export function formatCommitMarkers(
	ctx: Contextual<any, any>,
	...tags: string[]
): string {
	return `

[atomist:generated]
[atomist-skill:${ctx.skill.namespace}/${ctx.skill.name}]${
		tags.length > 0 ? "\n" : ""
	}${tags.map(t => `  [${t}]`).join("\n")}`;
}

export function formatMarkers(
	ctx: Contextual<any, any>,
	...tags: string[]
): string {
	const tx = isSubscriptionIncoming(ctx.trigger)
		? ctx.trigger.subscription.tx
		: undefined;
	return `
<!--
  [atomist:generated]
  [atomist-skill:${ctx.skill.namespace}/${ctx.skill.name}]
  [atomist-version:${ctx.skill.version}]
  [atomist-configuration:${toArray(ctx.configuration || [])
		.map(c => c.name)
		.join(",")}]
  [atomist-workspace-id:${ctx.workspaceId}]${
		tx
			? `
  [atomist-tx:${tx}]`
			: ""
	}
  [atomist-correlation-id:${ctx.correlationId}]${
		tags.length > 0 ? "\n" : ""
	}${tags.map(t => `  [${t}]`).join("\n")}
-->`;
}

export function formatFooter(ctx: Contextual<any, any>): string {
	const skillUrl =
		ctx.configuration?.parameters?.atomist?.skillUrl ||
		`https://go.atomist.com/catalog/skills/${ctx.skill.namespace}/${ctx.skill.name}`;
	return `	
---

<p align="center">
<sub>
<a href="${skillUrl}">${ctx.skill.namespace}/${
		ctx.skill.name
	}</a> \u00B7 ${toArray(ctx.configuration || [])
		.map(
			c =>
				`<a href="${
					c.parameters?.atomist?.configurationUrl || c.url
				}">Configure</a>`,
		)
		.join("\u00B7")}
</sub>
</p>`;
}

export async function convergeLabel(
	id: AuthenticatedRepositoryId<GitHubCredential | GitHubAppCredential>,
	name: string,
	color: string,
	description?: string,
): Promise<void> {
	try {
		await api(id).issues.updateLabel({
			name,
			color,
			description,
			repo: id.repo,
			owner: id.owner,
		});
	} catch (err) {
		await api(id).issues.createLabel({
			name,
			color,
			description,
			repo: id.repo,
			owner: id.owner,
		});
	}
}

export type ContentEditor = (
	read: (path: string) => Promise<{ path: string; content: string }>,
	write: (
		path: string,
		content: string,
		mode?: "100644" | "100755", // 100644 for file, 100755 for executable
	) => void,
) => Promise<{
	commit: {
		message: string;
		author?: {
			name: string;
			email: string;
		};
	};
}>;

export async function editContent(
	parameters: {
		credential: { token: string };
		owner: string;
		repo: string;
		base: string;
		sha: string;
		head?: string;
		force?: boolean;
	},
	...editors: ContentEditor[]
): Promise<string> {
	const files: Record<string, { content: string; mode?: string }> = {};
	const gh = api({
		credential: { token: parameters.credential.token, scopes: [] },
	});

	// TODO CD add path validation
	const read = async (path: string) => {
		if (!files[path]) {
			try {
				const response = (
					await gh.repos.getContent({
						owner: parameters.owner,
						repo: parameters.repo,
						ref: parameters.sha,
						path,
					})
				).data as { content?: string };
				files[path] = {
					content: Buffer.from(response.content, "base64").toString(),
				};
			} catch (e) {
				files[path] = { content: undefined };
			}
		}
		return {
			path,
			content: files[path].content,
		};
	};
	const write =
		(fileCache: Record<string, { content: string; mode?: string }>) =>
		(path, content, mode?) => {
			fileCache[path] = {
				content,
				mode,
			};
		};

	let sha = parameters.sha;
	let commit;
	for (const editor of editors) {
		const fileCache = {};
		const editResult = await editor(read, write(fileCache));
		const message = editResult.commit.message;
		const author = editResult.commit.author;

		// Persist changes
		const blobs = [];
		for (const path of Object.keys(fileCache)) {
			const file = fileCache[path];
			// Make changes visible to next editor
			files[path] = {
				content: file.content,
				mode: file.mode || files[file.path]?.mode,
			};

			const blob = (
				await gh.git.createBlob({
					owner: parameters.owner,
					repo: parameters.repo,
					content: Buffer.from(file.content).toString("base64"),
					encoding: "base64",
				})
			).data;

			blobs.push({
				path,
				type: "blob",
				mode: files[path].mode || "100644",
				sha: blob.sha,
			});
		}

		const tree = (
			await gh.git.createTree({
				owner: parameters.owner,
				repo: parameters.repo,
				base_tree: sha,
				tree: blobs,
			})
		).data;

		commit = (
			await gh.git.createCommit({
				owner: parameters.owner,
				repo: parameters.repo,
				parents: [sha],
				tree: tree.sha,
				author: {
					name: author?.name || "Atomist Bot",
					email: author?.email || "bot@atomist.com",
				},
				message,
			})
		).data;
		sha = commit.sha;
	}

	if (sha !== parameters.sha) {
		// Update the ref
		try {
			await gh.git.createRef({
				owner: parameters.owner,
				repo: parameters.repo,
				ref: `refs/heads/${parameters.head || parameters.base}`,
				sha: commit.sha,
			});
		} catch (e) {
			await gh.git.updateRef({
				owner: parameters.owner,
				repo: parameters.repo,
				ref: `heads/${parameters.head || parameters.base}`,
				sha: commit.sha,
				force: parameters.force,
			});
		}
	}

	return sha;
}
