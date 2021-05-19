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

import { truncateText } from "../github/check";
import { api, formatFooter, formatMarkers } from "../github/operation";
import { addCommitMarkers } from "../github/pull_request";
import { EventContext, EventHandler, HandlerStatus } from "../handler/handler";
import {
	chain,
	ChainedHandler,
	CreateFileCloneOptions,
	createRef,
	CreateRepositoryId,
} from "../handler/util";
import { AuthenticatedRepositoryId } from "../repository/id";
import * as status from "../status";
import { failure, success } from "../status";
import { hash } from "../util";

import uniq = require("lodash.uniq");

function cloneFiles<D, C>(
	options: string[] | CreateFileCloneOptions<D, C>,
): ChainedHandler<
	D,
	C,
	{
		id?: AuthenticatedRepositoryId<any>;
		files?: Array<{ path: string; content: string }>;
	}
> {
	return async ctx => {
		if (!ctx.chain.id) {
			return failure(
				"'id' missing in chain. Make sure to include 'createRef' in handler chain",
			);
		}
		const gh = api(ctx.chain.id);

		const paths: string[] =
			typeof options === "function" ? options(ctx) : options;

		ctx.chain.files = [];

		for (const path of paths) {
			const fileResponse = (
				await gh.repos.getContent({
					owner: ctx.chain.id.owner,
					repo: ctx.chain.id.repo,
					ref: ctx.chain.id.sha || ctx.chain.id.branch,
					path,
				})
			).data as { content?: string };
			ctx.chain.files.push({
				path,
				content: Buffer.from(fileResponse.content, "base64").toString(),
			});
		}
		return undefined;
	};
}

export function pullRequestHandler<S, C>(parameters: {
	when?: (ctx: EventContext<S, C>) => HandlerStatus | undefined;
	id: CreateRepositoryId<S, C>;
	clone: (ctx: EventContext<S, C>) => string[];
	execute: (
		ctx: EventContext<S, C> & {
			chain: {
				id: AuthenticatedRepositoryId<any>;
				files?: Array<{ path: string; content: string }>;
			};
		},
	) => Promise<{
		commit: {
			editors: Array<
				(
					ctx: EventContext<S, C> & {
						chain: {
							id: AuthenticatedRepositoryId<any>;
							files?: Array<{ path: string; content: string }>;
						};
					},
				) => Promise<
					| {
							changes: Array<{ path: string; content: string }>;
							message: string;
							detail?: string;
					  }
					| undefined
				>
			>;
		};
		pullRequest: (
			ctx: EventContext<S, C> & {
				chain: {
					id: AuthenticatedRepositoryId<any>;
					files?: Array<{ path: string; content: string }>;
				};
			},
			detail: string[],
		) => Promise<{
			title: string;
			body: string;
			branch: string;
			labels?: string[];
			reviewers?: string[];
			assignReviewer?: boolean;
		}>;
	}>;
}): EventHandler<S, C> {
	return chain<
		S,
		C,
		{
			id: AuthenticatedRepositoryId<any>;
			files?: Array<{ path: string; content: string }>;
		}
	>(
		async ctx => {
			if (parameters.when) {
				return parameters.when(ctx);
			}
			return undefined;
		},
		createRef<S, C>(parameters.id),
		async ctx => {
			try {
				const cloneResult = parameters.clone(ctx);
				await cloneFiles(cloneResult as any)(ctx);
			} catch (e) {
				return success(
					`Failed to clone ${ctx.chain.id.owner}/${
						ctx.chain.id.repo
					}#${ctx.chain.id.sha?.slice(0, 7) || ctx.chain.id.branch}`,
				).hidden();
			}
			return undefined;
		},
		async ctx => {
			const result = await parameters.execute(ctx);
			const gh = api(ctx.chain.id);

			const details = [];
			const changedFiles = [];

			let sha = ctx.chain.id.sha;
			let commit;

			for (const editor of result.commit.editors) {
				const editResult = await editor(ctx);

				if (editResult?.changes?.length > 0) {
					if (editResult.detail) {
						details.push(editResult.detail);
					}

					// Persist changes
					const blobs = [];
					for (const change of editResult.changes) {
						// Make changes visible to next editor
						ctx.chain.files.find(
							f => f.path === change.path,
						).content = change.content;
						changedFiles.push(change.path);

						const blob = (
							await gh.git.createBlob({
								owner: ctx.chain.id.owner,
								repo: ctx.chain.id.repo,
								content: Buffer.from(change.content).toString(
									"base64",
								),
								encoding: "base64",
							})
						).data;

						blobs.push({
							path: change.path,
							type: "blob",
							mode: "100644",
							sha: blob.sha,
						});
					}

					const tree = (
						await gh.git.createTree({
							owner: ctx.chain.id.owner,
							repo: ctx.chain.id.repo,
							base_tree: sha,
							tree: blobs,
						})
					).data;

					commit = (
						await gh.git.createCommit({
							owner: ctx.chain.id.owner,
							repo: ctx.chain.id.repo,
							parents: [sha],
							tree: tree.sha,
							author: {
								name: "Atomist Bot",
								email: "bot@atomist.com",
							},
							message: addCommitMarkers(editResult.message, ctx),
						})
					).data;
					sha = commit.sha;
				}
			}

			if (commit) {
				const pullRequest = await result.pullRequest(ctx, details);

				// Create the branch
				try {
					await gh.git.createRef({
						owner: ctx.chain.id.owner,
						repo: ctx.chain.id.repo,
						ref: `refs/heads/${pullRequest.branch}`,
						sha: commit.sha,
					});
				} catch (e) {
					await gh.git.updateRef({
						owner: ctx.chain.id.owner,
						repo: ctx.chain.id.repo,
						ref: `heads/${pullRequest.branch}`,
						sha: commit.sha,
						force: true,
					});
				}

				const files = uniq(changedFiles).sort();
				const hashes: Array<{ path: string; hash: string }> = [];
				for (const file of files) {
					const content = ctx.chain.files.find(
						f => f.path === file,
					).content;
					hashes.push({ path: file, hash: hash(content) });
				}
				const diffHash = hash(hashes);

				const slug = `${ctx.chain.id.owner}/${ctx.chain.id.repo}`;
				const repoUrl = `https://github.com/${slug}`;
				const body = (text: string) =>
					truncateText(`${text.trim()}

---

${files.length === 1 ? "File" : "Files"} changed:

${files
	.map(
		f =>
			`-   [\`${f}\`](https://github.com/${ctx.chain.id.owner}/${ctx.chain.id.repo}/blob/${pullRequest.branch}/${f})`,
	)
	.join("\n")}

<!-- atomist:hide -->
${formatFooter(ctx)}
<!-- atomist:show -->

${formatMarkers(ctx, `atomist-diff:${diffHash}`)}
`);

				const openPrs = await gh.paginate(gh.pulls.list, {
					owner: ctx.chain.id.owner,
					repo: ctx.chain.id.repo,
					state: "open",
					base: ctx.chain.id.branch,
					head: `${ctx.chain.id.owner}:${pullRequest.branch}`,
				});
				const newPr = openPrs.length !== 1;
				const pr = newPr
					? (
							await gh.pulls.create({
								owner: ctx.chain.id.owner,
								repo: ctx.chain.id.repo,
								title: pullRequest.title,
								body: body(pullRequest.body),
								base: ctx.chain.id.branch,
								head: pullRequest.branch,
							})
					  ).data
					: (
							await gh.pulls.update({
								owner: ctx.chain.id.owner,
								repo: ctx.chain.id.repo,
								pull_number: openPrs[0].number,
								title: pullRequest.title,
								body: body(pullRequest.body),
							})
					  ).data;
				if (pullRequest.labels?.length > 0) {
					// Remove prefixed labels that are getting set explicitly
					const prefixes = uniq(
						pullRequest.labels
							.filter(p => p.includes(":"))
							.map(p => p.split(":")[0] + ":"),
					);
					const existingLabels = (pr.labels || [])
						.map(l => l.name)
						.filter(l => !prefixes.some(p => l.startsWith(p)));

					await gh.issues.update({
						owner: ctx.chain.id.owner,
						repo: ctx.chain.id.repo,
						issue_number: pr.number,
						labels: uniq([
							...existingLabels,
							...pullRequest.labels,
						]),
					});
				}

				return status.success(
					`Pushed changes to [${slug}/${
						pullRequest.branch
					}](${repoUrl}) and ${newPr ? "raised" : "updated"} [#${
						pr.number
					}](${pr.html_url})`,
				);
			} else {
				return status.success(`No changes to push`);
			}
		},
	) as EventHandler<S, C>;
}
