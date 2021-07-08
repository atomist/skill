import * as fs from "fs-extra";
import * as os from "os";
import * as path from "path";

import { Contextual } from "./handler/handler";
import { guid } from "./util";

export async function createTmpDir(
	ctx: Contextual<any, any>,
	name?: string,
): Promise<string> {
	const tmpDir = path.join(os.tmpdir(), name || guid());
	await fs.ensureDir(tmpDir);
	ctx.onComplete(async () => {
		await fs.remove(tmpDir);
	});
	return tmpDir;
}

export async function createTmpFilePath(
	ctx: Contextual<any, any>,
	name?: string,
): Promise<string> {
	const tmpPath = path.join(os.tmpdir(), name || guid());
	ctx.onComplete(async () => {
		await fs.remove(tmpPath);
	});
	return tmpPath;
}
