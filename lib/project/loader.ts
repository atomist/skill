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

import { AuthenticatedRepositoryId } from "../repository/id";
import { CloneOptions } from "./clone";
import { clone, load, Project } from "./project";

export interface ProjectLoader {
	load<C>(
		id: AuthenticatedRepositoryId<C>,
		baseDir: string,
	): Promise<Project<C>>;

	clone<C>(
		id: AuthenticatedRepositoryId<C>,
		options?: CloneOptions,
	): Promise<Project<C>>;
}

export function createProjectLoader(): ProjectLoader {
	return new DefaultProjectLoader();
}

export class DefaultProjectLoader implements ProjectLoader {
	public async load(
		id: AuthenticatedRepositoryId<any>,
		baseDir: string,
	): Promise<Project> {
		return load(id, baseDir);
	}

	public async clone(
		id: AuthenticatedRepositoryId<any>,
		options?: CloneOptions,
	): Promise<Project> {
		return clone(id, options);
	}
}
