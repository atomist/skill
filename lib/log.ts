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

import {
    createLogger,
    Logger,
    Severity,
} from "@atomist/skill-logging";
import { redact } from "./redact";
import { toArray } from "./util";

export function wrapAuditLogger(
    context: { eventId?: string; correlationId: string; workspaceId: string },
    labels: Record<string, any> = {},
): Logger & { url: string } {
    const logger = createLogger(context, labels);
    return {
        log: async (
            msg: string | string[],
            severity: Severity = Severity.INFO,
            labels?: Record<string, any>,
        ): Promise<void> => {
            const msgs = toArray(msg);
            switch (severity) {
                case Severity.WARNING:
                    msgs.forEach(m => warn(m));
                    break;
                case Severity.ERROR:
                    msgs.forEach(m => error(m));
                    break;
                default:
                    msgs.forEach(m => info(m));
                    break;
            }
            return logger.log(msg, severity, labels);
        },
        url: `https://go.atomist.${
            (process.env.ATOMIST_GRAPHQL_ENDPOINT || "").includes("staging") ? "services" : "com"
        }/log/${context.workspaceId}/${context.correlationId}`,
    };
}

/**
 * Print the debug level message to stdout
 *
 * @param message The message to print
 * @param optionalParams Optional params to pass to the logger
 */
export function debug(message: string, ...optionalParams: any[]): void {
    if (enabled("debug")) {
        // tslint:disable-next-line:no-console
        console.debug(`[debug] ${redact(message)}`, ...optionalParams);
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
        // tslint:disable-next-line:no-console
        console.info(` [info] ${redact(message)}`, ...optionalParams);
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
        // tslint:disable-next-line:no-console
        console.warn(` [warn] ${redact(message)}`, ...optionalParams);
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
        // tslint:disable-next-line:no-console
        console.error(`[error] ${redact(message)}`, ...optionalParams);
    }
}

enum Level {
    error = 0,
    warn = 1,
    info = 2,
    debug = 3,
}

function enabled(level: string): boolean {
    const configuredLevel = Level[process.env.ATOMIST_LOG_LEVEL || "debug"];
    return configuredLevel >= Level[level];
}
