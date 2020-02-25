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

import { createContext } from "./context";
import {
    CommandContext,
    CommandHandler,
    EventContext,
    EventHandler,
    HandlerStatus,
} from "./handler";
import { StatusPublisher } from "./message";
import { CommandListenerExecutionInterruptError } from "./parameterPrompt";
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
}

export const entryPoint = async (pubSubEvent: PubSubMessage, context: { eventId: string }) => {
    const payload: CommandIncoming | EventIncoming =
        JSON.parse(Buffer.from(pubSubEvent.data, "base64").toString());
    console.log(`Incoming pub/sub message: ${JSON.stringify(payload, replacer)}`);
    if (isEventIncoming(payload)) {
        await processEvent(payload, context);
    } else if (isCommandIncoming(payload)) {
        await processCommand(payload, context);
    }
};

async function processEvent(event: EventIncoming, ctx: { eventId: string }): Promise<void> {
    const context = createContext(event, ctx) as EventContext<any>;
    const path = requirePath(`events/${context.name}`);
    try {
        console.log(`Invoking event handler '${context.name}'`);
        const handler = require(path).handler as EventHandler<any>;
        const result = await handler(context) as HandlerStatus;
        await (context.message as any as StatusPublisher).publish(result?.code || 0, result?.reason);
    }  catch (e) {
        console.error(e);
        await (context.message as any as StatusPublisher).publish(1, e);
    }
    console.log(`Completed event handler '${context.name}'`);
}

async function processCommand(event: CommandIncoming, ctx: { eventId: string }): Promise<void> {
    const context = createContext(event, ctx) as CommandContext;
    const path = requirePath(`commands/${context.name}`);
    try {
        console.log(`Invoking command handler '${context.name}'`);
        const handler = require(path).handler as CommandHandler;
        const result = await handler(context) as HandlerStatus;
        await (context.message as any as StatusPublisher).publish(result?.code || 0, result?.reason);
    }  catch (e) {
        if (e instanceof CommandListenerExecutionInterruptError) {
            await (context.message as any as StatusPublisher).publish(0);
        } else {
            console.error(e);
            await (context.message as any as StatusPublisher).publish(1, e);
        }
    }
    console.log(`Completed command handler '${context.name}'`);
}
