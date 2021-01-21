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

import { PubSub } from "@google-cloud/pubsub";
import { toEDNStringFromSimpleObject } from "edn-data";

import { debug, error } from "../log/console";
import { replacer } from "../util";

export type Transact<E extends string> = (
	entities: any | any[],
) => Promise<void>;

export function createTransact(
	workspaceId: string,
	correlationId: string,
): Transact<any> {
	return async entities => {
		const message = {
			api_version: "1",
			correlation_id: correlationId,
			team: {
				id: workspaceId,
			},
			type: "facts_ingestion",
			entities: toEDNStringFromSimpleObject(entities).replace(
				/":(.*?)"/gm,
				":$1",
			),
		};

		const topicName =
			process.env.ATOMIST_TOPIC ||
			`${this.workspaceId}-${this.request.skill.id}-response`;
		try {
			debug(`Sending message: ${JSON.stringify(message, replacer)}`);
			if (topicName) {
				const topic = new PubSub().topic(topicName);
				const messageBuffer = Buffer.from(
					JSON.stringify(message),
					"utf8",
				);
				await topic.publish(messageBuffer);
			}
		} catch (err) {
			error(`Error occurred sending message: ${err.message}`);
		}
	};
}
