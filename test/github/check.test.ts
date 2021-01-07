/*
 * Copyright © 2020 Atomist, Inc.
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

import { readFile } from "fs-extra";
import { join } from "path";
import * as assert from "power-assert";

import { truncateText } from "../../lib/github/check";

describe("check", () => {
	describe("truncateText", () => {
		it("should truncate text", () => {
			const text = "The quick brown fox jumps over the lazy dog";
			const result = truncateText(text, 20);
			assert.strictEqual(result, "The quic ... azy dog");
		});

		it("should not truncate text", () => {
			const text = "The quick brown fox jumps over the lazy dog";
			const result = truncateText(text);
			assert.strictEqual(result, text);
		});

		it("should trim when truncating", () => {
			const text =
				"\n\n  The quick    brown fox jumps over the    lazy dog  \n\n  ";
			const result = truncateText(text, 24);
			assert.strictEqual(result, "The quick ... lazy dog");
		});

		it("should trim when not truncating", () => {
			const text =
				"\n\n  The quick brown fox jumps over the lazy dog  \n\n  ";
			const result = truncateText(text);
			const exp = "The quick brown fox jumps over the lazy dog";
			assert.strictEqual(result, exp);
		});

		it("should use buffer length", () => {
			const text = "“Thœ ‘qüîçk’ b®øwñ ƒox jüµπß o√ér the låΩy ∂øg˙”";
			const result = truncateText(text, 45);
			const exp = "“Thœ ‘qüîçk’ ... låΩy ∂øg˙”";
			assert.strictEqual(result, exp);
		});

		it("should do nothing", () => {
			const text = ``;
			const result = truncateText(text);
			assert.strictEqual(result, text);
		});

		it("should truncate long text", async () => {
			const text = await readFile(join(__dirname, "vh-lm.txt"), "utf8");
			const result = truncateText(text);
			const exp = await readFile(join(__dirname, "vh-lm.trunc"), "utf8");
			assert.strictEqual(result, exp, "long text differed");
		});
	});
});
