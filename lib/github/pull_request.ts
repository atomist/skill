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

import * as fs from "fs-extra";
import { PushStrategy } from "../definition/parameter/definition";
import * as git from "../git/operation";
import { Contextual, HandlerStatus } from "../handler";
import { debug } from "../log/console";
import { Project } from "../project/project";
import * as status from "../status";
import { hash } from "../util";
import { api, formatMarkers } from "./operation";

import uniq = require("lodash.uniq");

export async function persistChanges(
	ctx: Contextual<any, any>,
	project: Project,
	strategy: PushStrategy,
	push: {
		branch: string;
		defaultBranch: string;
		author: { login: string; name?: string; email?: string };
	},
	pullRequest: {
		title: string;
		body: string;
		branch: string;
		labels?: string[];
		reviewers?: string[];
		assignReviewer?: boolean;
	},
	commit: {
		message?: string;
		editors?: Array<(project: Project) => Promise<string | undefined>>;
	},
): Promise<HandlerStatus> {
	const gitStatus = await git.status(project);
	if (gitStatus.isClean && commit.message) {
		return status.success(`No changes to push`);
	}
	debug(
		`Attempting to persist changes with: ${JSON.stringify({
			strategy,
			push,
			pullRequest,
			commit,
		})}`,
	);

	const commitOptions = {
		name: push.author.name,
		email: push.author.email,
	};
	const commitMsg =
		commit.message ||
		`Updates from ${ctx.skill.namespace}/${ctx.skill.name}`;
	const prBranch =
		pullRequest.branch ||
		`atomist/${ctx.skill.name.toLowerCase()}-${Date.now()}`;
	const repoUrl = `https://github.com/${project.id.owner}/${project.id.repo}`;

	if (gitStatus.detached) {
		// Make sure we are on a branch before committing the changes
		await git.stash(project, { add: true });
		await git.checkout(project, push.branch);
		await git.stashPop(project);
	}

	if (
		strategy === "pr" ||
		(push.branch === push.defaultBranch &&
			(strategy === "pr_default" || strategy === "pr_default_commit"))
	) {
		const changedFiles = await git.changedFiles(project);

		const gh = api(project.id);
		await git.createBranch(project, prBranch);

		for (const editor of commit.editors || []) {
			const msg = await editor(project);
			changedFiles.push(...(await git.changedFiles(project)));
			if (msg && !(await git.status(project)).isClean) {
				await git.commit(project, msg, commitOptions);
			}
		}

		const files = uniq(changedFiles).sort();

		const hashes: Array<{ path: string; hash: string }> = [];
		for (const file of files) {
			const content = (await fs.readFile(project.path(file))).toString(
				"base64",
			);
			hashes.push({ path: file, hash: hash(content) });
		}
		const diffHash = hash(hashes);

		const body = `${pullRequest.body.trim()}
		

---

${files.length === 1 ? "File" : "Files"} changed:
${files.map(f => ` * \`${f}\``).join("\n")}
${formatMarkers(ctx, `atomist-diff:${diffHash}`)}
`;

		const openPrs = (
			await gh.pulls.list({
				owner: project.id.owner,
				repo: project.id.repo,
				state: "open",
				base: push.branch,
				head: `${project.id.owner}:${prBranch}`,
				per_page: 100,
			})
		).data;
		if (openPrs.length === 1) {
			const pr = openPrs[0];
			const body = pr.body;
			const diffRegexp = /\[atomist-diff:([^\]]*)\]/g;
			const diffMatch = diffRegexp.exec(body);
			if (diffMatch?.[1] === diffHash) {
				return status.success(
					`Not pushed changes to [${project.id.owner}/${project.id.repo}/${prBranch}](${repoUrl}) because [#${pr.number}](${pr.html_url}) is up to date`,
				);
			}
		}

		if (!commit.editors || commit.editors.length === 0) {
			await git.commit(project, commitMsg, commitOptions);
		}
		await git.push(project, { force: true, branch: prBranch });

		let pr;

		let newPr = true;
		if (openPrs.length === 1) {
			newPr = false;
			pr = openPrs[0];
			await gh.pulls.update({
				owner: project.id.owner,
				repo: project.id.repo,
				pull_number: pr.number,
				body,
			});
		} else {
			pr = (
				await gh.pulls.create({
					owner: project.id.owner,
					repo: project.id.repo,
					title: pullRequest.title,
					body,
					base: push.branch,
					head: prBranch,
				})
			).data;
			if (pullRequest.labels?.length > 0) {
				await gh.issues.update({
					owner: project.id.owner,
					repo: project.id.repo,
					issue_number: pr.number,
					labels: pullRequest.labels,
				});
			}
		}
		if (
			!pullRequest.labels?.includes("auto-merge:on-check-success") &&
			(pullRequest.assignReviewer !== false ||
				pullRequest.reviewers?.length > 0)
		) {
			const reviewers = [...(pullRequest.reviewers || [])];
			if (
				pullRequest.assignReviewer !== false &&
				pr.user?.login !== push.author.login
			) {
				reviewers.push(push.author.login);
			}
			await gh.pulls.requestReviewers({
				owner: project.id.owner,
				repo: project.id.repo,
				pull_number: pr.number,
				reviewers,
			});
		}
		return status.success(
			`Pushed changes to [${project.id.owner}/${
				project.id.repo
			}/${prBranch}](${repoUrl}) and ${newPr ? "raised" : "updated"} [#${
				pr.number
			}](${pr.html_url})`,
		);
	} else if (
		strategy === "commit" ||
		(push.branch === push.defaultBranch && strategy === "commit_default") ||
		(push.branch !== push.defaultBranch && strategy === "pr_default_commit")
	) {
		for (const editor of commit.editors || []) {
			const msg = await editor(project);
			if (msg && !(await git.status(project)).isClean) {
				await git.commit(project, msg, commitOptions);
			}
		}
		if (!commit.editors || commit.editors.length === 0) {
			await git.commit(project, commitMsg, commitOptions);
		}
		await git.push(project);
		return status.success(
			`Pushed changes to [${project.id.owner}/${project.id.repo}/${push.branch}](${repoUrl})`,
		);
	}
	return status.success(`Not pushed because of selected push strategy`);
}

export async function closePullRequests(
	ctx: Contextual<any, any>,
	project: Project,
	base: string,
	head: string,
	comment: string,
): Promise<void> {
	const gh = api(project.id);
	const openPrs = (
		await gh.pulls.list({
			owner: project.id.owner,
			repo: project.id.repo,
			state: "open",
			base,
			head: `${project.id.owner}:${head}`,
			per_page: 100,
		})
	).data;

	for (const openPr of openPrs) {
		await gh.issues.createComment({
			owner: project.id.owner,
			repo: project.id.repo,
			issue_number: openPr.number,
			body: `${comment}
${formatMarkers(ctx)}`,
		});
		await gh.pulls.update({
			owner: project.id.owner,
			repo: project.id.repo,
			pull_number: openPr.number,
			state: "closed",
		});
	}
}
