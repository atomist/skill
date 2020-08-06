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

import {
	ButtonElement,
	Element,
	InputBlock,
	SlackModal,
} from "@atomist/slack-messages";
import { ParameterType } from "./button";

export function buttonForModal(
	button: ButtonElement,
	command: string,
	modal: SlackModal,
): ButtonElement {
	return {
		...button,
		modal: {
			name: command,
			view: modal,
		},
	} as any;
}

export function elementForCommand<E extends Element>(
	element: Element,
	command: string,
	parameters: ParameterType = {},
	parameterName?: string,
): E {
	return {
		...element,
		command: {
			name: command,
			parameters,
			parameterName,
		},
	} as any;
}

const modal: SlackModal = {
	type: "modal",
	title: {
		type: "plain_text",
		text: "Greeting",
	},
	blocks: [
		{
			type: "input",
			label: {
				type: "plain_text",
				text: "Message",
			},
			element: {
				type: "plain_text_input",
				placeholder: {
					type: "plain_text",
					text: "Your message",
				},
				multiline: true,
			},
		} as InputBlock,
	],
	close: {
		type: "plain_text",
		text: "Cancel",
	},
	submit: {
		type: "plain_text",
		text: "Send",
	},
};

const msg = {
	blocks: [
		{
			type: "section",
			text: {
				type: "mrkdwn",
				text: ":wave: Hello World",
			},
		},
		{
			type: "actions",
			elements: [
				elementForCommand(
					{
						type: "button",
						text: {
							type: "plain_text",
							text: "Say hi!",
						},
					} as ButtonElement,
					"helloWorld",
					{ response: "hi" },
				),
				buttonForModal(
					{
						type: "button",
						text: {
							type: "plain_text",
							text: "Respond",
						},
					},
					"helloWorld",
					modal,
				),
			],
		},
	],
};
