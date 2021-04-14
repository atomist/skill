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

import { createLogger, Logger } from "@atomist/skill-logging";

import { clearLogger, setLogger } from "./console";

export function createAuditLogger(
	context: {
		eventId?: string;
		correlationId: string;
		workspaceId: string;
		skillId: string;
	},
	labels: Record<string, any> = {},
	onComplete: (callback: () => Promise<void>) => void,
): Pick<Logger, "log"> & { url: string } {
	const logger = createLogger(context, labels);
	setLogger(logger);
	onComplete(async () => {
		await logger.close();
		clearLogger();
	});
	return {
		log: logger.log,
		url: `https://go.atomist.${
			(process.env.ATOMIST_GRAPHQL_ENDPOINT || "").includes("staging")
				? "services"
				: "com"
		}/log/${context.workspaceId}/${context.correlationId}`,
	};
}

enum Level {
	error = 0,
	warn = 1,
	info = 2,
	debug = 3,
}

export function enabled(level: string): boolean {
	const configuredLevel = Level[process.env.ATOMIST_LOG_LEVEL || "debug"];
	return configuredLevel >= Level[level];
}
