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

import * as path from "path";

import { spawnPromise } from "../child_process";
import * as git from "../git/index";
import { info } from "../log/console";
import { bucketName } from "../storage/provider";

export async function downloadSkill(
	cwd: string,
	workspaceId: string,
): Promise<void> {
	const filePath = path.join(cwd, ".atomist", "skill.yaml");

	const originUrl = await spawnPromise(
		"git",
		["config", "--get", "remote.origin.url"],
		{ cwd },
	);
	const giturl = (await import("git-url-parse"))(originUrl.stdout.trim());
	const status = await git.status(cwd);

	const storage = new (await import("@google-cloud/storage")).Storage();
	await storage
		.bucket(bucketName(workspaceId))
		.file(`skills/${giturl.owner}/${giturl.name}/${status.sha}.yaml`)
		.download({
			destination: filePath,
		});

	info(`Downloaded skill metadata`);
}
