import * as assert from "assert";
import { findGraphQLFile } from "../lib/graphql";

describe("graphql", () => {
	describe("findGraphQLFile", () => {
		it("should fail when file not found", async () => {
			try {
				await findGraphQLFile("test.graphql", "query");
			} catch (e) {
				assert(e.message.includes("No 'graphql' found up from"));
			}
		});
		it("should find subscription", async () => {
			const result = await findGraphQLFile(
				"github/onTag.graphql",
				"subscription",
			);
			assert(result.includes("onTag"));
			assert(!result.includes("...repoFields"));
		});
	});
});
