import * as crypto from "crypto";

export async function sign<T = any>(
	payload: string | T,
	privateKey: crypto.KeyObject,
): Promise<string> {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const { default: CompactSign } = require("jose/jws/compact/sign");
	const jws = await new CompactSign(
		Buffer.from(
			typeof payload === "string" ? payload : JSON.stringify(payload),
		),
	)
		.setProtectedHeader({ alg: "ES512" })
		.sign(privateKey);
	return jws;
}

export async function verify<T>(
	signature: string,
	publicKey: crypto.KeyObject,
): Promise<string | T> {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const { default: compactVerify } = require("jose/jws/compact/verify");
	const { payload } = await compactVerify(signature, publicKey);
	try {
		return JSON.parse(Buffer.from(payload).toString()) as T;
	} catch (e) {
		return Buffer.from(payload).toString();
	}
}
