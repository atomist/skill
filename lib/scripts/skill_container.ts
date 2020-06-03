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
import * as yaml from "js-yaml";
import * as path from "path";
import { info } from "../log";
import {
    AtomistSkillInput,
    content,
    icon,
} from "./skill_input";

export async function createYamlSkillInput(cwd: string): Promise<AtomistSkillInput> {
    info(`Generating skill metadata...`);

    const p = path.join(cwd, "skill.yaml");
    const doc = yaml.safeLoad((await fs.readFile(p)).toString());
    const is = doc.skill ? doc.skill : doc;

    const rc = content(cwd);

    const subscriptions = [];
    for (const subscription of (is.subscriptions || ["file://**/graphql/subscription/*.graphql"])) {
        subscriptions.push(...(await rc(subscription)));
    }

    let readme = (await rc(is.readme || "file://README.md"))[0];
    let description = (await rc(is.description || "file://skill/description.md"))[0];
    if (readme) {
        if (!description) {
            const descriptionRegexp = /<!---atomist-skill-description:start--->([\s\S]*)<!---atomist-skill-description:end--->/gm;
            const descriptionMatch = descriptionRegexp.exec(readme);
            if (descriptionMatch) {
                description = descriptionMatch[1].trim();
            }
        }
        const readmeRegexp = /<!---atomist-skill-readme:start--->([\s\S]*)<!---atomist-skill-readme:end--->/gm;
        const readmeMatch = readmeRegexp.exec(readme);
        if (readmeMatch) {
            readme = readmeMatch[1].trim();
        }
    }

    const y: Omit<AtomistSkillInput, "commitSha" | "branchId" | "repoId"> = {
        ...is,
        description,
        longDescription: (await rc(is.longDescription || "file://skill/long_description.md"))[0],
        iconUrl: await icon(cwd, is.iconUrl || "file://skill/icon.svg"),
        readme: readme ? Buffer.from(readme).toString("base64") : undefined,
        subscriptions,
    };

    if (!y.longDescription) {
        y.longDescription = y.description;
    }

    return y as any;
}