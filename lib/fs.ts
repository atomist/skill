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
