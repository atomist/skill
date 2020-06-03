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

import * as fs from "fs-extra";
import * as path from "path";
import { spawnPromise } from "../child_process";
import {
    debug,
    info,
} from "../log";
import { withGlobMatches } from "../project/util";

export async function bundleSkill(cwd: string,
                                  minify: boolean,
                                  sourceMap: boolean,
                                  verbose: boolean): Promise<void> {
    if (!verbose) {
        process.env.ATOMIST_LOG_LEVEL = "info";
    }
    info(`Creating skill bundle...`);
    
    const events = await withGlobMatches<string>(cwd, ["events/*.js", "lib/events/*.js"], async file => {
        const content = (await fs.readFile(path.join(cwd, file))).toString();
        if (/exports\.handler\s*=/.test(content)) {
            const name = path.basename(file);
            return `registerEvent("${name.replace(/\.js/, "")}", async () => (await import("./${file.replace(/\.js/, "")}")).handler);`;
        }
        return undefined;
    });
    const commands = await withGlobMatches<string>(cwd, ["commands/*.js", "lib/commands/*.js"], async file => {
        const content = (await fs.readFile(path.join(cwd, file))).toString();
        if (/exports\.handler\s*=/.test(content)) {
            const name = path.basename(file);
            return `registerCommand("${name.replace(/\.js/, "")}", async () => (await import("./${file.replace(/\.js/, "")}")).handler);`;
        }
        return undefined;
    });

    const imports = [];
    if (commands.length > 0) {
        imports.push("registerCommand");
    }
    if (events.length > 0) {
        imports.push("registerEvent");
    }

    const skillTs = [
        `import { ${imports.join(", ")} } from "@atomist/skill/lib/bundle";`,
        `export const entryPoint = require("@atomist/skill/lib/bundle").bundle;`,
    ];

    await fs.writeFile(path.join(cwd, "skill.ts"), `${skillTs.join("\n")}
${events.join("\n")}
${commands.join("\n")}`);

    const nccArgs = ["build", "skill.ts", "-o", "bundle"];
    if (minify) {
        nccArgs.push("-m");
    }
    if (sourceMap) {
        nccArgs.push("-s");
    }

    // Run ncc
    await spawnPromise(path.join(cwd, "node_modules", ".bin", "ncc"), nccArgs, { cwd, log: { write: msg => debug(msg.trim()) } });

    // Update package.json
    // - rewrite main
    // - remove dependencies
    const pjContent = (await fs.readFile(path.join(cwd, "package.json"))).toString()
        .replace(/"dependencies"(\s*:)/, `"_dependencies_"$1`)
        .replace(/"devDependencies"(\s*:)/, `"_devDependencies_"$1`)
        .replace(/"main"(\s*:)/, `"_main_"$1`);
    const pj = JSON.parse(pjContent);
    pj.main = "bundle/index.js";
    await fs.writeJson(path.join(cwd, "package.json"), pj, { spaces: "  " });

    await fs.remove(path.join(cwd, "package-lock.json"));
    await fs.remove(path.join(cwd, "skill.ts"));
    info(`Skill bundle created at '${path.join(cwd, "bundle")}'`);

}
