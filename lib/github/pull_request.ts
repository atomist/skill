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

import { PushStrategy } from "../definition/parameter/definition";
import * as git from "../git/operation";
import { Contextual, HandlerStatus } from "../handler";
import { Project } from "../project/project";
import * as status from "../status";
import { api, formatMarkers } from "./operation";

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
	commit: { message: string },
): Promise<HandlerStatus> {
	const gitStatus = await git.status(project);
	if (gitStatus.isClean) {
		return status.success(`No changes to push`);
	}

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
	const sha = gitStatus.sha;

	if (
		strategy === "pr" ||
		(push.branch === push.defaultBranch &&
			(strategy === "pr_default" || strategy === "pr_default_commit"))
	) {
		const gh = api(project.id);
		try {
			const branch = (
				await gh.repos.getBranch({
					owner: project.id.owner,
					repo: project.id.repo,
					branch: prBranch,
				})
			).data;
			if (branch.commit?.parents?.some(p => p.sha === sha)) {
				return status.success(
					`Not pushed because of same commit in base branch`,
				);
			}
		} catch (e) {
			// Ignore when branch does not exist
		}

		const changedFiles = (
			await project.exec("git", ["diff", "--name-only"])
		).stdout
			.split("\n")
			.map(f => f.trim())
			.filter(f => !!f && f.length > 0);
		const untrackedFiles = (
			await project.exec("git", [
				"ls-files",
				"--exclude-standard",
				"--others",
			])
		).stdout
			.split("\n")
			.map(f => f.trim())
			.filter(f => !!f && f.length > 0);
		const files = [...changedFiles, ...untrackedFiles].sort();
		const body = `${pullRequest.body.trim()}

---

${files.length === 1 ? "File" : "Files"} changed:
${files.map(f => ` * \`${f}\``).join("\n")}
${formatMarkers(ctx)}
`;

		await git.createBranch(project, prBranch);
		await git.commit(project, commitMsg, commitOptions);
		await git.push(project, { force: true, branch: prBranch });

		let pr;

		let newPr = true;
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
		await git.commit(project, commitMsg, commitOptions);
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
