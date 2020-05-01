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

// tslint:disable-next-line:no-import-side-effect
import "source-map-support/register";

import { Severity } from "@atomist/skill-logging";
import { createContext } from "./context";
import {
    CommandContext,
    CommandHandler,
    EventContext,
    EventHandler,
    HandlerStatus,
} from "./handler";
import {
    debug,
    info,
} from "./log";
import {
    prepareStatus,
    StatusPublisher,
} from "./message";
import { CommandListenerExecutionInterruptError } from "./parameter_prompt";
import {
    CommandIncoming,
    EventIncoming,
    isCommandIncoming,
    isEventIncoming,
} from "./payload";
import {
    replacer,
    requirePath,
} from "./util";

export interface PubSubMessage {
    data: string;
    attributes: any;
}

export const entryPoint = async (pubSubEvent: PubSubMessage, context: { eventId: string }): Promise<void> => {
    const attributes = {
        ...(pubSubEvent.attributes || {}),
        eventId: context.eventId,
    };
    debug(`atm:attributes=${JSON.stringify(attributes)}`);

    const payload: CommandIncoming | EventIncoming =
        JSON.parse(Buffer.from(pubSubEvent.data, "base64").toString());
    info(`Incoming pub/sub message: ${JSON.stringify(payload, replacer)}`);
    // debug(`Incoming message context: ${JSON.stringify(context, replacer)}`);
    // debug(`Incoming message: ${JSON.stringify(pubSubEvent, replacer)}`);

    if (isEventIncoming(payload)) {
        await processEvent(payload, context);
    } else if (isCommandIncoming(payload)) {
        await processCommand(payload, context);
    }
};

export async function processEvent(event: EventIncoming, ctx: { eventId: string }): Promise<void> {
    const context = createContext(event, ctx) as EventContext<any>;
    try {
        const path = await requirePath(`events/${context.name}`);
        debug(`Invoking event handler '${context.name}'`);
        const handler = require(path).handler as EventHandler<any>;
        const result = await handler(context) as HandlerStatus;
        await (context.message as any as StatusPublisher).publish(prepareStatus(result || { code: 0 }, context));
    }  catch (e) {
        await context.audit.log(`Error occurred: ${e.stack}`, Severity.ERROR);
        await (context.message as any as StatusPublisher).publish(prepareStatus(e, context));
    }
    debug(`Completed event handler '${context.name}'`);
}

export async function processCommand(event: CommandIncoming, ctx: { eventId: string }): Promise<void> {
    const context = createContext(event, ctx) as CommandContext;
    try {
        const path = await requirePath(`commands/${context.name}`);
        debug(`Invoking command handler '${context.name}'`);
        const handler = require(path).handler as CommandHandler;
        const result = await handler(context) as HandlerStatus;
        await (context.message as any as StatusPublisher).publish(prepareStatus(result || { code: 0 }, context));
    }  catch (e) {
        if (e instanceof CommandListenerExecutionInterruptError) {
            await (context.message as any as StatusPublisher).publish(prepareStatus({ code: 0 }, context));
        } else {
            await context.audit.log(`Error occurred: ${e.stack}`, Severity.ERROR);
            await (context.message as any as StatusPublisher).publish(prepareStatus(e, context));
        }
    }
    debug(`Completed command handler '${context.name}'`);
}
