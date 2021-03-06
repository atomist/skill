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

import { fail } from "power-assert";

import { validatePath } from "../../lib/github/operation";

describe("operation", () => {
	describe("validatePath", () => {
		it("should reject empty path", () => {
			try {
				validatePath("");
				fail();
			} catch (e) {
				// this is expected
			}
		});
		it("should reject absolute path", () => {
			try {
				validatePath("/foo/bar.json");
				fail();
			} catch (e) {
				// this is expected
			}
		});
		it("should reject invalid path", () => {
			try {
				validatePath("foo&/bar%.json");
				fail();
			} catch (e) {
				// this is expected
			}
		});
		it("should accept valid path", () => {
			try {
				validatePath("foo/bar.json");
			} catch (e) {
				fail();
			}
		});
	});
});
