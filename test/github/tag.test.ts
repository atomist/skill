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

import { incrementTag } from "../../lib/github/tag";
import * as log from "../../lib/log/console";

describe("tags", () => {
	describe("incrementTag", () => {
		let origDebug: any;
		before(() => {
			origDebug = Object.getOwnPropertyDescriptor(log, "debug");
			Object.defineProperty(log, "debug", {
				value: () => {
					return;
				},
			});
		});
		after(() => {
			if (origDebug) {
				Object.defineProperty(log, "debug", origDebug);
			}
		});

		it("increments prerelease tag by prerelease", () => {
			const tag = incrementTag(["0.1.0-1"], "prerelease");
			assert.deepStrictEqual(tag, "0.1.0-2");
		});

		it("increments patch tag by prerelease", () => {
			const tag = incrementTag(["0.1.0"], "prerelease");
			assert.deepStrictEqual(tag, "0.1.1-0");
		});

		it("returns default prerelease", () => {
			const tag = incrementTag([], "prerelease");
			assert.deepStrictEqual(tag, "0.1.0-0");
		});

		it("increments patch tag by patch", () => {
			const tag = incrementTag(["0.1.0-1", "0.1.1"], "patch");
			assert.deepStrictEqual(tag, "0.1.2");
		});

		it("increment prelease tag by minor", () => {
			const tag = incrementTag(["0.1.0-1"], "minor");
			assert.deepStrictEqual(tag, "0.1.0");
		});

		it("increment prerelease by major", () => {
			const tag = incrementTag(["0.1.0-1"], "major");
			assert.deepStrictEqual(tag, "1.0.0");
		});
	});
});
