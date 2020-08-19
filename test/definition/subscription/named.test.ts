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
import { named } from "../../../lib/definition/subscription/named";

describe("named", () => {
	it("should load onNewChatUser subscription", () => {
		const subscription = named("@atomist/skill/chat/onNewUser");
		assert.deepStrictEqual(
			subscription,
			`subscription onNewUser {
  ChatId {
    screenName
    isBot
    timezoneLabel
    person {
      forename
      surname
      name
      emails {
        address
      }
      gitHubId {
        login
      }
      chatId {
        screenName
        chatTeam {
          id
        }
      }
    }
  }
}
`,
		);
	});
});
