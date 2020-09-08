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

import { EventHandler, log, repository, secret, status } from "@atomist/skill";
import * as fs from "fs-extra";
import { NpmReleaseConfiguration } from "../configuration";
import {
	cleanSemVer,
	isReleaseSemVer,
	matchingPreReleaseSemanticVersions,
} from "../semver";
import { OnTagSubscription } from "../typings/types";

export const handler: EventHandler<
	OnTagSubscription,
	NpmReleaseConfiguration
> = async ctx => {
	const tag = ctx.data.Tag[0];
	const tagName = tag?.name;
	if (!isReleaseSemVer(tagName)) {
		return {
			code: 0,
			reason: `Not a semantic version tag: ${tag}`,
			visibility: "hidden",
		};
	}
	const releaseVersion = cleanSemVer(tagName);

	const repo = tag.commit.repo;
	await ctx.audit.log(`Starting npm Release on ${repo.owner}/${repo.name}`);

	const credential = await ctx.credential.resolve(
		secret.gitHubAppToken({
			owner: repo.owner,
			repo: repo.name,
			apiUrl: repo.org.provider.apiUrl,
		}),
	);

	const project = await ctx.project.clone(
		repository.gitHub({
			owner: repo.owner,
			repo: repo.name,
			credential,
			branch: tagName,
		}),
		{ alwaysDeep: false },
	);
	await ctx.audit.log(
		`Cloned repository ${repo.owner}/${repo.name}#${tagName}`,
	);

	let commitTags: string[];
	try {
		const listTagsResult = await project.exec("git", [
			"tag",
			"--list",
			`--points-at=${tag.commit.sha}`,
		]);
		commitTags = listTagsResult.stdout.trim().split("\n");
	} catch (e) {
		const reason = `Failed to list tags for commit ${tag.commit.sha}: ${e.message}`;
		await ctx.audit.log(reason);
		return status.failure(reason);
	}
	if (!commitTags.includes(tagName)) {
		const reason = `Tag ${tagName} not associated with commit ${
			tag.commit.sha
		}: ${commitTags.join(" ")}`;
		await ctx.audit.log(reason);
		return status.failure(reason);
	}
	const preReleaseTags = matchingPreReleaseSemanticVersions(
		releaseVersion,
		commitTags,
	);
	if (preReleaseTags.length < 1) {
		const reason = `Failed to find prerelease tag matching ${tagName}: ${commitTags.join(
			" ",
		)}`;
		await ctx.audit.log(reason);
		return status.failure(reason);
	}
	const preReleaseVersion = cleanSemVer(preReleaseTags[0]);

	const pkgJsonPath = project.path("package.json");
	let pkgName: string;
	try {
		const pkgJson: { name: string } = await fs.readJson(pkgJsonPath);
		pkgName = pkgJson.name;
	} catch (e) {
		const reason = `Failed to read package.json: ${e.message}`;
		await ctx.audit.log(reason);
		return status.failure(reason);
	}

	try {
		await project.exec("npm", ["pack", `${pkgName}@${preReleaseVersion}`]);
	} catch (e) {
		const reason = `Failed to download ${pkgName}@${preReleaseVersion}: ${e.message}`;
		await ctx.audit.log(reason);
		return status.failure(reason);
	}

	const pkgTgz = `${pkgName}-${preReleaseVersion}.tgz`
		.replace(/^@/, "")
		.replace(/\//g, "-");
	try {
		await project.exec("tar", ["-x", "-z", "-f", pkgTgz]);
	} catch (e) {
		const reason = `Failed to unpack ${pkgTgz}: ${e.message}`;
		await ctx.audit.log(reason);
		return status.failure(reason);
	}

	try {
		await project.exec(
			"npm",
			["version", "--no-git-tag-version", releaseVersion],
			{
				cwd: project.path("package"),
			},
		);
	} catch (e) {
		const reason = `Failed to undate version of package to ${pkgName}@${releaseVersion}: ${e.message}`;
		await ctx.audit.log(reason);
		return status.failure(reason);
	}

	const access = ctx.configuration?.[0]?.parameters?.restricted
		? "restricted"
		: "public";
	try {
		await project.exec("npm", [
			"publish",
			"package",
			`--access=${access}`,
			"--tag=latest",
		]);
	} catch (e) {
		const reason = `Failed to publish release version of package ${pkgName}@${releaseVersion}: ${e.message}`;
		await ctx.audit.log(reason);
		return status.failure(reason);
	}
	log.info(`Published ${pkgName}@${preReleaseVersion} as ${releaseVersion}`);

	return status.success(`Release ${pkgName} version ${releaseVersion}`);
};
