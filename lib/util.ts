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
import * as uuid from "uuid/v4";
import { Arg } from "./payload";

export function toArray<T>(value: T | T[]): T[] {
    if (value) {
        if (Array.isArray(value)) {
            return value;
        } else {
            return [value];
        }
    } else {
        return undefined;
    }
}

export async function requirePath(folderOrFile: string): Promise<string> {
    const p = __dirname.split("/node_modules/");
    const rp = path.join(p[0], folderOrFile);
    const lp = path.join(p[0], "lib", folderOrFile);
    if (await fs.pathExists(rp + ".js")) {
        return rp;
    } else if (await fs.pathExists(lp + ".js")) {
        return lp;
    }
    throw new Error(`'${folderOrFile}' not found in '${p[0]}' or '${p[0]}/lib'`);
}

export function extractParameters(intent: string): Arg[] {
    const args: Arg[] = [];
    const regexp = /^[a-zA-Z\s]*(\s+--([a-z.A-Z_]*)=(?:'([^']*?)'|"([^"]*?)"|([\w]*?)))*$/g;
    let intentToMatch = intent.trim();
    let match = regexp.exec(intentToMatch);
    while (!!match && !!match[1] && !!match[2]) {
        const name = match[2];
        const value = match[3] || match[4] || match[5];
        args.push({ name, value });
        intentToMatch = intentToMatch.replace(match[1], "").trim();
        regexp.lastIndex = 0;
        match = regexp.exec(intentToMatch);
    }

    return args.reduce((p, c) => {
        if (!p.some(e => e.name === c.name)) {
            p.push(c);
        }
        return p;
    }, []).reverse();
}

export function replacer(key: string, value: any): any {
    if (key === "secrets" && value) {
        return value.map(v => ({ uri: v.uri, value: hideString(v.value) }));
    } else if (/token|password|jwt|url|secret|authorization|key|cert|pass|user/i.test(key)) {
        return hideString(value);
    } else {
        return value;
    }
}

export function hideString(value: any): any {
    if (!value) {
        return value;
    }

    if (typeof value === "string") {
        let newValue = "";
        for (let i = 0; i < value.length; i++) {
            if (i === 0) {
                newValue = value.charAt(0);
            } else if (i < value.length - 1) {
                newValue += "*";
            } else {
                newValue += value.slice(-1);
            }
        }
        return newValue;
    } else if (Array.isArray(value)) {
        return value.map(hideString);
    }
    return value;
}

export function guid(): string {
    return uuid();
}
