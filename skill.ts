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

import {
	Category,
	parameter,
	ParameterType,
	resourceProvider,
	skill,
} from "@atomist/skill";
import { NpmReleaseConfiguration } from "./lib/configuration";

export const Skill = skill<NpmReleaseConfiguration & { repos: any }>({
	displayName: "npm Release",
	categories: [Category.Deploy, Category.DevOps],

	resourceProviders: {
		github: resourceProvider.gitHub({ minRequired: 1 }),
		npm: resourceProvider.npmJSRegistry({ minRequired: 1 }),
	},

	parameters: {
		restricted: {
			type: ParameterType.Boolean,
			displayName: "Restricted access",
			description:
				"Select to publish a private package, otherwise package will be public",
			required: false,
		},
		repos: parameter.repoFilter(),
	},

	subscriptions: ["@atomist/skill/github/onTag"],
});
