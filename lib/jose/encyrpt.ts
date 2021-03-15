import * as crypto from "crypto";

export async function decrypt<T = any>(
	jwe: string,
	privateKey: crypto.KeyObject,
): Promise<string | T> {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const { default: compactDecrypt } = require("jose/jwe/compact/decrypt");
	const { plaintext } = await compactDecrypt(jwe, privateKey);
	try {
		return JSON.parse(Buffer.from(plaintext).toString());
	} catch (e) {
		return Buffer.from(plaintext).toString();
	}
}

export async function encrypt<T>(
	payload: string | T,
	publicKey: crypto.KeyObject,
): Promise<string> {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const { default: CompactEncrypt } = require("jose/jwe/compact/encrypt");
	return new CompactEncrypt(
		Buffer.from(
			typeof payload === "string" ? payload : JSON.stringify(payload),
		),
	)
		.setProtectedHeader({ alg: "RSA-OAEP-256", enc: "A256GCM" })
		.encrypt(publicKey);
}
