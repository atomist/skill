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

import * as assert from "assert";
import { extractParameters, guid } from "../lib/util";

describe("util", () => {
	describe("extractParameters", () => {
		it("should extract no parameters", () => {
			const intent = "create issue";
			const args = extractParameters(intent);
			assert.deepStrictEqual(args, []);
		});

		it("should extract one parameter", () => {
			const intent = "create issue --title=Test ";
			const args = extractParameters(intent);
			assert.deepStrictEqual(args, [{ name: "title", value: "Test" }]);
		});

		it("should extract multiple parameters", () => {
			const intent = "create issue --title=Test --body='This is a Test'";
			const args = extractParameters(intent);
			assert.deepStrictEqual(args, [
				{ name: "title", value: "Test" },
				{ name: "body", value: "This is a Test" },
			]);
		});

		it("should extract last parameter instance from multiple instances", () => {
			const intent =
				"create issue --title=Test1 --body='This is a test' --title=Test2";
			const args = extractParameters(intent);
			assert.deepStrictEqual(args, [
				{ name: "body", value: "This is a test" },
				{ name: "title", value: "Test2" },
			]);
		});
	});

	describe("guid", () => {
		it("generates uuid", () => {
			const uuid = guid();
			assert(!!uuid);
		});
	});
});
