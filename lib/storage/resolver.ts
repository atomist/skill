import * as fs from "fs-extra";
import * as os from "os";
import * as path from "path";

import { guid } from "../util";

export const GoogleCloudStoragePayloadResolver = {
	supports: (rawUrl: string) => rawUrl.startsWith("gs://"),
	resolve: async (rawUrl: string) => {
		const url = new URL(rawUrl);
		const targetFilePath = path.join(os.tmpdir() || "/tmp", guid());
		await fs.ensureDir(path.dirname(targetFilePath));
		const storage = new (await import("@google-cloud/storage")).Storage();
		const file = storage.bucket(url.host).file(url.pathname.slice(1));
		await file.download({ destination: targetFilePath });
		// await file.delete();
		return fs.readJson(targetFilePath);
	},
};
