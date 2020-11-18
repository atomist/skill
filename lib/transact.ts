import { PubSub } from "@google-cloud/pubsub";
import { toEDNStringFromSimpleObject } from "edn-data";
import { debug, error } from "./log/console";
import { replacer, toArray } from "./util";

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
	toArray(entities).forEach(e => {
		const entityType = Object.keys(e)[0];
		for (const key of Object.keys(e[entityType])) {
			const value = e[entityType][key];
			if (Array.isArray(value)) {
				const newValue = [];
				toArray(value).forEach(v => {
					if (typeof v === "object") {
						const nestedEntityType = Object.keys(v)[0];
						v["schema/entity"] = `${nestedEntityType}-${counter++}`;
						flattenedEntities.push(v);
						newValue.push(v["schema/entity"]);
					} else {
						newValue.push(v);
					}
				});
				e[entityType][key] = newValue;
			} else if (typeof value === "object") {
				const nestedEntityType = Object.keys(value)[0];
				value["schema/entity"] = `${nestedEntityType}-${counter++}`;
				flattenedEntities.push(value);
				e[entityType][key] = value["schema/entity"];
			}
		}
	});

	return toArray(flattenedEntities).map(e => {
		const entityType = Object.keys(e)[0];
		const entityId = e["schema/entity"];
		const entity: any = {
			"schema/entity-type": entityType,
		};
		if (entityId) {
			entity["schema/entity"] = entityId;
		}
		for (const key of Object.keys(e[entityType])) {
			entity[`${entityType.replace(/\//, ".")}/${key}`] =
				e[entityType][key];
		}
		return entity;
	});
}
