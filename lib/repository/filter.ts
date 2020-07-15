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

import { Contextual } from "../handler";

export function matchesFilter(
    repoId: string,
    orgId: string,
    configurationName: string,
    parameterName: string,
    ctx: Contextual<any, any>,
): boolean {
    const cfg = ctx.configuration.find(c => c.name === configurationName);
    const repoFilter = cfg.parameters[parameterName];
    if (repoFilter) {
        const excludes = repoFilter.excludes || [];
        const includes = repoFilter.includes || [];
        if (includes.length === 0 && excludes.length === 0) {
            return true;
        } else if (excludes.some(e => (e.repoIds || []).includes(repoId))) {
            return false;
        } else if (includes.some(i => (i.repoIds || []).includes(repoId))) {
            return true;
        } else if (excludes.some(e => e.ownerId === orgId && !e.repoIds)) {
            return false;
        } else if (includes.some(i => i.ownerId === orgId && !i.repoIds)) {
            return true;
        }
        return false;
    }
    return true;
}
