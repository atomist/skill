import * as assert from "assert";
import * as path from "path";
import { Project } from "../../lib/project/project";
import { globFiles } from "../../lib/project/util";

describe("util", () => {

    describe("globFiles", () => {

        it("should find all expected files", async () => {
            const project: Project = {
                path: (...elements: string[]) => {
                    return path.join(process.cwd(), ...elements);
                },
            } as any;
            const files = await globFiles(project, ["**/*.ts", "!**/*.d.ts"]);
            assert(files.length > 0);
        });

    });

});
