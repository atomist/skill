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

import * as assert from "power-assert";
import { truncateText } from "../../lib/github/check";

describe("check", () => {
	describe("truncateText", () => {
		it("should truncate text", () => {
			const text = "The quick brown fox jumps over the lazy dog";
			const result = truncateText(text, 21);
			assert.deepStrictEqual(result.length, 21);
		});

		it("should not truncate text", () => {
			const text = "The quick brown fox jumps over the lazy dog";
			const result = truncateText(text);
			assert.deepStrictEqual(result, text);
		});
	});
});
