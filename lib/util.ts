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

import * as crypto from "crypto";
import * as fs from "fs-extra";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";

import { error } from "./log";
import { Arg } from "./payload";

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function hash(obj: any): string {
	const hash = crypto.createHash("sha256");
	hash.update(typeof obj === "string" ? obj : JSON.stringify(obj));
	return hash.digest("hex");
}

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

export function handlerLoader<T>(type: string) {
	return async (name: string, cwd?: string): Promise<T> => {
		const path = await requirePath(type, name, cwd);
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const f = require(path);
		if (f[name]) {
			return f[name] as T;
		} else {
			return f.handler as T;
		}
	};
}

export async function requirePath(
	type: string,
	file: string,
	cwd?: string,
): Promise<string> {
	const p = cwd || __dirname.split("/node_modules/")[0];
	const rp = path.join(p, type, file);
	const lp = path.join(p, "lib", type, file);
	if (await fs.pathExists(rp + ".js")) {
		return rp;
	} else if (await fs.pathExists(lp + ".js")) {
		return lp;
	}

	// Test the fallback
	const f = path.join(p, type);
	const fl = path.join(p, "lib", type);
	if (await fs.pathExists(f + ".js")) {
		return f;
	} else if (await fs.pathExists(fl + ".js")) {
		return fl;
	}

	throw new Error(`'${file}' not found in '${p}' or '${p}/lib'`);
}

export function extractParameters(intent: string): Arg[] {
	const args: Arg[] = [];
	// eslint-disable-next-line no-useless-escape
	const regexp = /^[a-zA-Z\s]*(\s+--([a-z.A-Z_]*)=(?:'([^']*?)'|"([^"]*?)"|([\w\-]*?)))*$/g;
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
	} else if (
		/token|password|jwt|url|secret|authorization|key|cert|pass|user/i.test(
			key,
		)
	) {
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
	return uuidv4();
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

export function handleErrorSync<T>(
	f: () => T,
	cb: (err: Error) => T | undefined = DefaultErrorHandler,
): T | undefined {
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
