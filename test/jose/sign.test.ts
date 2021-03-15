import * as assert from "assert";
import * as crypto from "crypto";
import * as fs from "fs-extra";
import * as path from "path";

import { sign, verify } from "../../lib/jose/sign";

describe("sign", () => {
	it("should correctly sign and verify", async () => {
		const publicKey = crypto.createPublicKey({
			key: fs.readFileSync(path.join(__dirname, "public.pem")),
		});
		const privateKey = crypto.createPrivateKey({
			key: fs.readFileSync(path.join(__dirname, "private.pem")),
		});
		const payload = "The big brown fox jumps over the fence";
		const signature = await sign(payload, privateKey);
		assert(!!signature);
		const decrypt = await verify(signature, publicKey);
		assert.deepStrictEqual(payload, decrypt);
	});
});
