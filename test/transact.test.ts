import * as assert from "assert";
import { Entity, flattenEntities } from "../lib/transact";

describe("transact", () => {
	describe("flattenEntities", () => {
		it("should flatten simple docker image entity", async () => {
			const entity: Entity<"docker/image"> = {
				"docker/image": {
					image:
						"gcr.io/atomist-container-registry/pochta:3ec0bb7bab4012119d168263c79677ddb3084c48",
					sha: "3ec0bb7bab4012119d168263c79677ddb3084c48",
					labels: "foo",
				},
			};
			const result = flattenEntities(entity);
			assert.deepStrictEqual(result, [
				{
					"schema/entity-type": "docker/image",
					"docker.image/image":
						"gcr.io/atomist-container-registry/pochta:3ec0bb7bab4012119d168263c79677ddb3084c48",
					"docker.image/sha":
						"3ec0bb7bab4012119d168263c79677ddb3084c48",
					"docker.image/labels": "foo",
				},
			]);
		});
	});
});
