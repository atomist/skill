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

import { Logger, Severity } from "@atomist/skill-logging";
import { sprintf } from "sprintf-js";

import { redact } from "./redact";
import { enabled } from "./util";

/**
 * Print the debug level message to stdout
 *
 * @param message The message to print
 * @param optionalParams Optional params to pass to the logger
 */
export function debug(message: string, ...optionalParams: any[]): void {
	if (enabled("debug")) {
		const fmsg = redact(sprintf(message, ...optionalParams));
		if (getLogger()) {
			getLogger().log(fmsg, Severity.Debug);
		} else {
			// tslint:disable-next-line:no-console
			console.debug(`[debug] ${fmsg}`);
		}
	}
}

/**
 * Print the info level message to stdout
 *
 * @param message The message to print
 * @param optionalParams Optional params to pass to the logger
 */
export function info(message: string, ...optionalParams: any[]): void {
	if (enabled("info")) {
		const fmsg = redact(sprintf(message, ...optionalParams));
		if (getLogger()) {
			getLogger().log(fmsg, Severity.Debug);
		} else {
			// tslint:disable-next-line:no-console
			console.info(` [info] ${fmsg}`);
		}
	}
}

/**
 * Print the warn level message to stdout
 *
 * @param message The message to print
 * @param optionalParams Optional params to pass to the logger
 */
export function warn(message: string, ...optionalParams: any[]): void {
	if (enabled("warn")) {
		const fmsg = redact(sprintf(message, ...optionalParams));
		if (getLogger()) {
			getLogger().log(fmsg, Severity.Warning);
		} else {
			// tslint:disable-next-line:no-console
			console.warn(` [warn] ${fmsg}`);
		}
	}
}

/**
 * Print the error level message to stdout
 *
 * @param message The message to print
 * @param optionalParams Optional params to pass to the logger
 */
export function error(message: string, ...optionalParams: any[]): void {
	if (enabled("error")) {
		const fmsg = redact(sprintf(message, ...optionalParams));
		if (getLogger()) {
			getLogger().log(fmsg, Severity.Error);
		} else {
			// tslint:disable-next-line:no-console
			console.error(`[error] ${fmsg}`);
		}
	}
}

export function clearLogger(logger: Logger): void {
	(global as any)._logger = undefined;
}

export function setLogger(logger: Logger): void {
	(global as any)._logger = logger;
}

function getLogger(): Logger {
	return (global as any)._logger;
}
