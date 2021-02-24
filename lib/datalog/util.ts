/*
 * Copyright © 2021 Atomist, Inc.
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

import kebabcase = require("lodash.kebabcase");

export function entity(
	type: string,
	attributes: Record<
		string,
		string | number | boolean | Date | { set: string[] } | { add: string[] }
	>,
	name?: string,
): any {
	const e = {
		"schema/entity-type": `:${type}`,
	};
	if (name) {
		e["schema/entity"] = name;
	}
	const prefix = type.replace(/\//g, ".");
	for (const attribute of Object.keys(attributes)) {
		if (attribute.includes("/")) {
			e[attribute] = attributes[attribute];
		} else {
			e[kebabcase(`${prefix}/${attribute}`)] = attributes[attribute];
		}
	}
	return e;
}
