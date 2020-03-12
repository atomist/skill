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

import { Severity } from "@atomist/skill-logging";
import {
    CommandContext,
    EventContext,
    HandlerStatus,
} from "./handler";
import { warn } from "./log";

/**
 * Single step in the Skill execution
 */
export interface Step<C extends EventContext | CommandContext, G extends Record<string, any> = any> {
    /** Name of the step */
    name: string;
    /** Function that gets called when the step should execute */
    run: (context: C, parameters: G) => Promise<void | HandlerStatus>;
    /** Optional function to indicate if the step should run */
    runWhen?: (context: C, parameters: G) => Promise<boolean>;
}

/**
 * Execute provided skill steps in the order they are provided or until one fails
 */
export async function runSteps<C extends EventContext | CommandContext>(context: C,
                                                                        ...steps: Array<Step<C>>): Promise<void | HandlerStatus> {
    const parameters: Record<string, any> = {};

    for (const step of steps) {
        try {
            if (!step.runWhen || !!(await step.runWhen(context, parameters))) {
                await context.audit.log(`Running step '${step.name}'`);

                const result = await step.run(context, parameters);
                if (!!result && result.code !== 0) {
                    await context.audit.log(`Step '${step.name}' errored with: ${result.reason}`, Severity.ERROR);
                    return result;
                } else if (!!result) {
                    await context.audit.log(`Completed step '${step.name}' with: ${result.reason}`);
                } else {
                    await context.audit.log(`Completed step '${step.name}'`);
                }
            } else {
                await context.audit.log(`Skipping step '${step.name}'`);
            }
        } catch (e) {
            await context.audit.log(`Step '${step.name}' errored with: ${e.message}`, Severity.ERROR);
            warn(`Step '${step.name}' errored with:`);
            warn(e);
            return {
                code: 1,
                reason: `Step '${step.name}' errored`,
            };
        }
    }
}
