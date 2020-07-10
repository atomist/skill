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
import { failure, success } from "../lib/status";

describe("status", () => {
    it("should create success status", () => {
        const status = success("This is a test");
        assert.deepStrictEqual(status.code, 0);
        assert.deepStrictEqual(status.reason, "This is a test");
        assert(!status.visibility);
        status.hidden();
        assert.deepStrictEqual(status.visibility, "hidden");
    });

    it("should create failure status", () => {
        const status = failure("This is a test");
        assert.deepStrictEqual(status.code, 1);
        assert.deepStrictEqual(status.reason, "This is a test");
        assert(!status.visibility);
        status.hidden();
        assert.deepStrictEqual(status.visibility, "hidden");
    });
});
