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

import * as assert from "assert";

import { Entity, flattenEntities } from "../../lib/transact/transact";

describe("transact", () => {
	describe("flattenEntities", () => {
		it("should flatten simple docker image entity", async () => {
			const entity: Entity<"docker/image"> = {
				"docker/image": {
					image:
						"gcr.io/atomist-container-registry/pochta:3ec0bb7bab4012119d168263c79677ddb3084c48",
					sha: "3ec0bb7bab4012119d168263c79677ddb3084c48",
					labels: [
						{
							"docker/image/label": {
								name: "author",
								value: "Atomist",
							},
						},
						{
							"docker/image/label": {
								name: "version",
								value: "1.0.0",
							},
						},
					],
				},
			};
			const result = flattenEntities(entity);
			assert.deepStrictEqual(result, [
				{
					"docker.image/image":
						"gcr.io/atomist-container-registry/pochta:3ec0bb7bab4012119d168263c79677ddb3084c48",
					"docker.image/labels": [
						"docker.image/label-0",
						"docker.image/label-1",
					],
					"docker.image/sha":
						"3ec0bb7bab4012119d168263c79677ddb3084c48",
					"schema/entity-type": "docker/image",
				},
				{
					"docker.image.label/name": "author",
					"docker.image.label/value": "Atomist",
					"schema/entity": "docker.image/label-0",
					"schema/entity-type": "docker.image/label",
				},
				{
					"docker.image.label/name": "version",
					"docker.image.label/value": "1.0.0",
					"schema/entity": "docker.image/label-1",
					"schema/entity-type": "docker.image/label",
				},
			]);
		});
	});
});
