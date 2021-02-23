import { EventHandler, WebhookHandler } from "./handler";

export function chain<D, C>(
	...handlers: Array<EventHandler<D, C> | WebhookHandler<D, C>>
): EventHandler<D, C> | WebhookHandler<D, C> {
	return async ctx => {
		for (const handler of handlers) {
			const result = await handler(ctx);
			if (result) {
				return result;
			}
		}
		return undefined;
	};
}
