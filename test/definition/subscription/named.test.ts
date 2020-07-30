import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { named } from "../../../lib/definition/subscription/named";

describe("named", () => {
	it("should load onNewChatUser subscription", () => {
		const subscription = named("@atomist/skill/onNewChatUser");
		assert.deepStrictEqual(
			subscription,
			fs
				.readFileSync(
					path.join(
						process.cwd(),
						"graphql",
						"subscription",
						"onNewChatUser.graphql",
					),
				)
				.toString(),
		);
	});
});
