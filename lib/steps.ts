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

export interface StepListener<C extends EventContext | CommandContext, G extends Record<string, any> = any> {
    starting?(step: Step<C>, parameters: G): Promise<void>;

    skipped?(step: Step<C>, parameters: G): Promise<void>;

    completed?(step: Step<C>, parameters: G, result: undefined | HandlerStatus): Promise<void>;

    failed?(step: Step<C>, parameters: G, error: Error): Promise<void>;

    done?(parameters: G, result: undefined | HandlerStatus): Promise<undefined | HandlerStatus>;
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
    const listeners = toArray(options.listeners) || [];
    let result;

    for (const step of toArray(options.steps)) {
        try {
            if (!step.runWhen || !!(await step.runWhen(context, parameters))) {
                await context.audit.log(`Running '${step.name}'`);
                await invokeListeners(listeners.filter(l => !!l.starting), async l => l.starting(step, parameters));

                const sr = await step.run(context, parameters);
                if (sr) {
                    result = sr;
                }
                await invokeListeners(listeners.filter(l => !!l.completed), async l => l.completed(step, parameters, sr));

                if (!!sr && sr.code !== 0) {
                    await context.audit.log(`'${step.name}' errored with: ${sr.reason}`, Severity.ERROR);
                    return sr;
                } else if (!!sr && !!sr.reason) {
                    await context.audit.log(`Completed '${step.name}' with: ${sr.reason}`);
                } else {
                    await context.audit.log(`Completed '${step.name}'`);
                }
            } else {
                await context.audit.log(`Skipping '${step.name}'`);
                await invokeListeners(listeners.filter(l => !!l.skipped), async l => l.skipped(step, parameters));
            }
        } catch (e) {
            await context.audit.log(`'${step.name}' errored with: ${e.message}`, Severity.ERROR);
            await context.audit.log(e.stack, Severity.ERROR);
            await invokeListeners(listeners.filter(l => !!l.failed), async l => l.failed(step, parameters, e));
            warn(`'${step.name}' errored with:`);
            warn(e.stack);
            return {
                code: 1,
                reason: `'${step.name}' errored`,
            };
        }
    }
    return invokeDone(listeners.filter(l => !!l.done), parameters, result);
}

async function invokeListeners(listeners: Array<StepListener<any>>,
                               cb: (l: StepListener<any>) => Promise<void>): Promise<void> {
    for (const listener of listeners) {
        try {
            await cb(listener);
        } catch (e) {
            warn("Listener failed with");
            warn(e);
        }
    }
}

async function invokeDone(listeners: Array<StepListener<any>>,
                          parameters: any,
                          inputResult: undefined | HandlerStatus): Promise<undefined | HandlerStatus> {
    let result = inputResult;
    for (const listener of listeners) {
        try {
            result = await listener.done(parameters, result);
        } catch (e) {
            warn("Listener failed with:");
            warn(e);
        }
    }
    return result;
}
