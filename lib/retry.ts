import * as pRetry from "p-retry";

export async function retry<T>(
	cb: () => Promise<T>,
	options: pRetry.Options = {
		retries: 5,
		factor: 3,
		minTimeout: 1 * 500,
		maxTimeout: 5 * 1000,
		randomize: true,
	},
): Promise<T> {
	const retry = await import("p-retry");
	return retry(() => cb(), options);
}
