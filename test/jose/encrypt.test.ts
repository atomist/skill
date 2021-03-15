import * as assert from "assert";
import * as crypto from "crypto";
import * as fs from "fs-extra";
import * as path from "path";

import { decrypt, encrypt } from "../../lib/jose/encyrpt";

describe("encrypt", () => {
	it("should correctly encrypt and decrypt", async () => {
		const publicKey = crypto.createPublicKey({
			key: fs.readFileSync(path.join(__dirname, "rsa-public.pem")),
		});
		const privateKey = crypto.createPrivateKey({
			key: fs.readFileSync(path.join(__dirname, "rsa-private.pem")),
			passphrase: "P4&M[N@WvxAHR@rH,WjtN6q+u(*C_5;`",
		});

		const payload = { text: "The big brown fox jumps over the fence" };
		const signature = await encrypt(payload, publicKey);
		console.log(encodeURIComponent(signature));
		assert(!!signature);
		const plaintext = await decrypt(signature, privateKey);
		assert.deepStrictEqual(payload, plaintext);
	});
});
