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
import * as fs from "fs-extra";
import { commit, createBranch } from "../lib/git/operation";
import * as log from "../lib/log";
import { createProjectLoader } from "../lib/project/loader";
import { gitHubComRepository } from "../lib/repository/id";
import { status } from "../lib/git/operation";

describe("project", () => {
    let originalLogDebug: any;
    before(() => {
        originalLogDebug = Object.getOwnPropertyDescriptor(log, "debug");
        Object.defineProperty(log, "debug", {
            value: async () => {
                return;
            },
        });
    });
    after(() => {
        Object.defineProperty(log, "debug", originalLogDebug);
    });

    it("should clone public repo", async () => {
        const p = await createProjectLoader().clone(
            gitHubComRepository({ owner: "atomist", repo: "skill", credential: undefined }),
        );
        const baseDir = p.path();
        const readmePath = p.path("README.md");
        assert(baseDir);
        assert.strictEqual(await fs.pathExists(readmePath), true);

        await fs.remove(readmePath);
        const gs = await status(p);
        assert(!!gs);
        await createBranch(p, "test-" + Date.now());
        const gs1 = await status(p);
        assert(!!gs1);
        const changedFiles = (await p.exec("git", ["diff", "--name-only"])).stdout
            .split("\n")
            .filter(f => !!f && f.length > 0);
        assert(changedFiles.length > 0);
        await commit(p, "Test commit");
    });
});
