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

import * as path from "path";
import { Arg } from "./payload";

export function toArray<T>(value: T | T[]): T[] {
    if (!!value) {
        if (Array.isArray(value)) {
            return value;
        } else {
            return [value];
        }
    } else {
        return undefined;
    }
}

export function requirePath(folderOrFile: string): string {
    const p = __dirname.split("/node_modules/");
    return path.join(p[0], folderOrFile);
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
