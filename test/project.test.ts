import * as assert from "assert";
import * as fs from "fs-extra";
import {
    createProjectLoader,
    gitHubComRepository,
} from "../lib/project";

describe("project", () => {

    it("should clone public repo", async () => {
        const p = await createProjectLoader().clone(gitHubComRepository({ owner: "atomist", repo: "skill", credential: undefined }));
        const baseDir = p.path();
        const readmePath = p.path("README.md");
        assert(baseDir);
        assert.equal(await fs.pathExists(readmePath), true);
    });

});
