import * as crypto from "crypto";
import * as fs from "fs-extra";
import * as path from "path";

import { encrypt } from "../jose/encyrpt";

export async function badgeLink(parameters: {
	sha: string;
	policy: string;
	workspaceId: string;
}): Promise<string> {
	const publicKey = crypto.createPublicKey(
		await fs.readFile(path.join(__dirname, "badge-public.pem")),
	);
	const encrypted = await encrypt(parameters, publicKey);
	return `https://us-east1-atomist-skill-production.cloudfunctions.net/global-badge-creator/badge/${encodeURIComponent(
		encrypted,
	)}`;
}
