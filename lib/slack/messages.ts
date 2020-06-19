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

import { Attachment, SlackMessage, url } from "@atomist/slack-messages";
import { Contextual } from "../handler";
import { guid } from "../util";

export function successMessage(
    title: string,
    text: string,
    ctx: Contextual<any, any>,
    options: Partial<Attachment> = {},
): SlackMessage {
    const msg: SlackMessage = {
        attachments: [
            {
                author_icon: `https://images.atomist.com/rug/check-circle.gif?gif=${guid()}`,
                author_name: title,
                text,
                fallback: text,
                color: "#37A745",
                mrkdwn_in: ["text"],
                footer: footer(ctx),
                ts: ts(),
                ...options,
            },
        ],
    };
    return msg;
}

export function questionMessage(
    title: string,
    text: string,
    ctx: Contextual<any, any>,
    options: Partial<Attachment> = {},
): SlackMessage {
    const msg: SlackMessage = {
        attachments: [
            {
                author_icon: `https://images.atomist.com/rug/question.png`,
                author_name: title,
                text,
                fallback: text,
                color: "#B5B5B5",
                mrkdwn_in: ["text"],
                footer: footer(ctx),
                ts: ts(),
                ...options,
            },
        ],
    };
    return msg;
}

export function infoMessage(
    title: string,
    text: string,
    ctx: Contextual<any, any>,
    options: Partial<Attachment> = {},
): SlackMessage {
    const msg: SlackMessage = {
        attachments: [
            {
                author_icon: `https://images.atomist.com/rug/info.png`,
                author_name: title,
                text,
                fallback: text,
                color: "#B5B5B5",
                mrkdwn_in: ["text"],
                footer: footer(ctx),
                ts: ts(),
                ...options,
            },
        ],
    };
    return msg;
}

export function warningMessage(
    title: string,
    text: string,
    ctx: Contextual<any, any>,
    options: Partial<Attachment> = {},
): SlackMessage {
    const msg: SlackMessage = {
        attachments: [
            {
                author_icon: `https://images.atomist.com/rug/warning-yellow.png`,
                author_name: title,
                text,
                fallback: text,
                color: "#D7B958",
                mrkdwn_in: ["text"],
                footer: supportLink(ctx),
                ts: ts(),
                ...options,
            },
        ],
    };
    return msg;
}

export function errorMessage(
    title: string,
    text: string,
    ctx: Contextual<any, any>,
    options: Partial<Attachment> = {},
): SlackMessage {
    const msg: SlackMessage = {
        attachments: [
            {
                author_icon: "https://images.atomist.com/rug/error-circle.png",
                author_name: title,
                text,
                fallback: text,
                color: "#BC3D33",
                mrkdwn_in: ["text"],
                footer: supportLink(ctx),
                ts: ts(),
                ...options,
            },
        ],
    };
    return msg;
}

export function supportLink(ctx: Contextual<any, any>): string {
    const supportUrl = `https://atomist.typeform.com/to/yvnyOj?message_id=${Buffer.from(ctx.correlationId).toString(
        "base64",
    )}`;
    return `${footer(ctx)} \u00B7 ${url(supportUrl, "Support")}`;
}

export function footer(ctx: Contextual<any, any>): string {
    return `${ctx.skill.namespace}/${ctx.skill.name}`;
}

export function ts(): number {
    return Math.floor(Date.now() / 1000);
}

export function separator(): string {
    return "\u00B7";
}
