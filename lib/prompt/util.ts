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

import { CommandContext } from "../handler";
import { ParameterPromptObject } from "./prompt";

export async function configurationWithParameters<PARAMS, C>(
    ctx: CommandContext<C>,
    parameters: ParameterPromptObject<PARAMS>,
): Promise<PARAMS & { configuration: C }> {
    const cfgs = ctx.configuration;
    const promptParameters: any = {
        ...(parameters || {}),
    };

    if (cfgs.length > 1) {
        promptParameters.configuration = {
            description: "Please select a Skill configuration",
            type: { kind: "single", options: cfgs.map(c => ({ value: c.name, description: c.name })) },
        };
    }

    const params = await ctx.parameters.prompt<PARAMS & { configuration: string }>(promptParameters);
    return {
        ...params,
        configuration: cfgs.length === 1 ? cfgs[0] : cfgs.find(c => c.name === params.configuration),
    } as any;
}
