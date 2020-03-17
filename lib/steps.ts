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
import { toArray } from "./util";

/**
 * Single step in the Skill execution
 */
export interface Step<C extends EventContext | CommandContext, G extends Record<string, any> = any> {
    /** Name of the step */
    name: string;
    /** Function that gets called when the step should execute */
    run: (context: C, parameters: G) => Promise<undefined | HandlerStatus>;
    /** Optional function to indicate if the step should run */
    runWhen?: (context: C, parameters: G) => Promise<boolean>;
}

export interface StepListener<C extends EventContext | CommandContext> {
    starting(step: Step<C>): Promise<void>;

    skipped(step: Step<C>): Promise<void>;

    completed(step: Step<C>, result: undefined | HandlerStatus): Promise<void>;

    failed(step: Step<C>, error: Error): Promise<void>;
}

/**
 * Execute provided skill steps in the order they are provided or until one fails
 */
export async function runSteps<C extends EventContext | CommandContext>(options: {
    context: C;
    steps: Step<C> | Array<Step<C>>;
    listeners?: StepListener<C> | Array<StepListener<C>>;
}): Promise<undefined | HandlerStatus> {
    const parameters: Record<string, any> = {};
    const context = options.context;
    const listeners = toArray(options.listeners);

    for (const step of toArray(options.steps)) {
        try {
            if (!step.runWhen || !!(await step.runWhen(context, parameters))) {
                await context.audit.log(`Running '${step.name}'`);
                await invokeListeners(listeners, async l => l.starting(step));

                const result = await step.run(context, parameters);
                await invokeListeners(listeners, async l => l.completed(step, result));

                if (!!result && result.code !== 0) {
                    await context.audit.log(`'${step.name}' errored with: ${result.reason}`, Severity.ERROR);
                    return result;
                } else if (!!result && !!result.reason) {
                    await context.audit.log(`Completed '${step.name}' with: ${result.reason}`);
                } else {
                    await context.audit.log(`Completed '${step.name}'`);
                }
            } else {
                await context.audit.log(`Skipping '${step.name}'`);
                await invokeListeners(listeners, async l => l.skipped(step));
            }
        } catch (e) {
            await context.audit.log(`'${step.name}' errored with: ${e.message}`, Severity.ERROR);
            await invokeListeners(listeners, async l => l.failed(step, e));
            warn(`'${step.name}' errored with:`);
            warn(e);
            return {
                code: 1,
                reason: `'${step.name}' errored`,
            };
        }
    }
    return undefined;
}

async function invokeListeners(listeners: Array<StepListener<any>>, cb: (l: StepListener<any>) => Promise<void>): Promise<void> {
    for (const listener of listeners) {
        try {
            await cb(listener);
        } catch (e) {
            warn("Listener failed with: %s", JSON.stringify(e));
        }
    }
}
