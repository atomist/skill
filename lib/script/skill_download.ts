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
