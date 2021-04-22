import { CommandIncoming, EventIncoming, WebhookIncoming } from "./payload";
import { GoogleCloudStoragePayloadResolver } from "./storage/resolver";

/**
 * Resolve an incoming payload to the actual incoming message by
 * following 'message_uri' pointers
 */
export async function resolvePayload(pubSubEvent: {
	data: string;
}): Promise<EventIncoming | CommandIncoming | WebhookIncoming> {
	const payload = JSON.parse(
		Buffer.from(pubSubEvent.data, "base64").toString(),
	);

	if (payload.message_uri) {
		const resolver = DefaultResolvers.find(r =>
			r.supports(payload.message_uri),
		);
		if (resolver) {
			return resolvePayload(await resolver.resolve(payload.message_uri));
		} else {
			throw new Error(`Unknown message_uri provided`);
		}
	} else {
		return payload;
	}
}

export type PayloadResolver = {
	supports: (url: string) => boolean;
	resolve: (url: string) => Promise<{ data: string }>;
};

const DefaultResolvers = [GoogleCloudStoragePayloadResolver];
