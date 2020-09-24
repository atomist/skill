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
import * as path from "path";
import { inlineFragments } from "../../../lib/definition/subscription/util";

describe("util", () => {
	it("should not inline query spreads", () => {
		const query = `query NpmRegistryProvider {
  NpmRegistryProvider {
    __typename
    scope
    url
    ... on NpmJSRegistryProvider {
      _typenames
      id
      name
      credential {
        ... on Password {
          secret
        }
        owner {
          login
        }
        id
      }
    }
    ... on GitHubNpmRegistryProvider {
      _typenames
      id
      name
      credential {
        ... on OAuthToken {
          owner {
            name
          }
          scopes
          secret
        }
      }
      gitHubAppInstallation {
        id
        owner
      }
    }
  }
}`;
		const result = inlineFragments(
			query,
			path.join(__dirname, "..", "..", "..", "graphql"),
		);
		assert.strictEqual(result, query);
	});
});
