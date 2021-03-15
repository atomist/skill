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
