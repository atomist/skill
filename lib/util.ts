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
import { createContext } from "./context";
import { PushStrategy } from "./definition/parameter/definition";
import { error } from "./log";
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

export async function handlerLoader<T>(name: string, cwd?: string): Promise<T> {
    const path = await requirePath(name, cwd);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require(path).handler as T;
}

export async function requirePath(file: string, cwd?: string): Promise<string> {
    const p = cwd || __dirname.split("/node_modules/")[0];
    const rp = path.join(p, file);
    const lp = path.join(p, "lib", file);
    if (await fs.pathExists(rp + ".js")) {
        return rp;
    } else if (await fs.pathExists(lp + ".js")) {
        return lp;
    }
    throw new Error(`'${file}' not found in '${p[0]}' or '${p[0]}/lib'`);
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

    return args
        .reduce((p, c) => {
            if (!p.some(e => e.name === c.name)) {
                p.push(c);
            }
            return p;
        }, [])
        .reverse();
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function replacer(key: string, value: any): any {
    if (key === "secrets" && value) {
        return value.map(v => ({ uri: v.uri, value: hideString(v.value) }));
    } else if (/token|password|jwt|url|secret|authorization|key|cert|pass|user/i.test(key)) {
        return hideString(value);
    } else {
        return value;
    }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
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

export async function handleError<T>(
    f: () => Promise<T>,
    cb: (err: Error) => T | undefined = DefaultErrorHandler,
): Promise<T | undefined> {
    try {
        const result = await f();
        return result;
    } catch (e) {
        return cb(e);
    }
}

export function handleErrorSync<T>(f: () => T, cb: (err: Error) => T | undefined = DefaultErrorHandler): T | undefined {
    try {
        return f();
    } catch (e) {
        return cb(e);
    }
}

export const DefaultErrorHandler: (err: Error) => undefined = err => {
    error(`Error occurred: %s`, err.message);
    if (err.stack) {
        error(err.stack);
    }
    return undefined;
};

export type ConfigurationMapper = (value: any, key: string) => string[];

export function identity(): ConfigurationMapper {
    return (v, k) => [`--${k}`, v];
}

export function file(name: string): ConfigurationMapper {
    return (v, k) => {
        fs.writeFileSync(name, v);
        return [`--${k}`, name];
    };
}

export function configurationToArgs(mapping: Record<string, ConfigurationMapper>): string[] {
    const args = [];
    const payload = fs.readJsonSync(process.env.ATOMIST_PAYLOAD);
    const ctx = createContext(payload as any, {} as any);
    for (const key of ctx.configuration?.[0]?.parameters) {
        const value = ctx.configuration[0].parameters[key];
        const arg = mapping?.[key]?.(value, key);
        if (arg) {
            args.push(...arg);
        }
    }
    return args;
}
