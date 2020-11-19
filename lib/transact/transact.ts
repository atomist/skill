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
import { replacer, toArray } from "../util";

export type Entity<E extends string> = Record<E, Record<string, any>>;
export type Transact<E extends string> = (
	entities: Entity<E> | Entity<E>[],
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
			entities: toEDNStringFromSimpleObject(flattenEntities(entities)),
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

export function flattenEntities(
	entities: Entity<any> | Entity<any>[],
): Record<string, any>[] {
	// Flatten nested objects
	const flattenedEntities = [...toArray(entities)];

	let counter = 0;
	const extractNested = (v: any) => {
		const nestedEntityType = Object.keys(v)[0];
		v["schema/entity"] = `${convertEntityType(
			nestedEntityType,
		)}-${counter++}`;
		flattenedEntities.push(v);
		return v["schema/entity"];
	};

	toArray(entities).forEach(e => {
		const entityType = Object.keys(e)[0];
		for (const key of Object.keys(e[entityType])) {
			const value = e[entityType][key];
			if (Array.isArray(value)) {
				const newValue = [];
				toArray(value).forEach(v => {
					if (typeof v === "object") {
						newValue.push(extractNested(v));
					} else {
						newValue.push(v);
					}
				});
				e[entityType][key] = newValue;
			} else if (typeof value === "object") {
				e[entityType][key] = extractNested(value);
			}
		}
	});

	return toArray(flattenedEntities).map(e => {
		const entityType = Object.keys(e)[0];
		const entityId = e["schema/entity"];
		const entity: any = {
			"schema/entity-type": convertEntityType(entityType),
		};
		if (entityId) {
			entity["schema/entity"] = entityId;
		}
		for (const key of Object.keys(e[entityType])) {
			entity[
				convertEntityType(`${entityType.replace(/\//, ".")}/${key}`)
			] = e[entityType][key];
		}
		return entity;
	});
}

function convertEntityType(type: string): string {
	const parts = type.split(/\.|\//);
	if (parts.length > 1) {
		const lastPart = parts.slice(-1)[0];
		const firstParts = parts.slice(0, -1);
		return `${firstParts.join(".")}/${lastPart}`;
	} else {
		return type;
	}
}
