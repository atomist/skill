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
    skill,
    SkillCommand,
    SkillRuntime,
} from "./lib/skill";

const HelloWorldCommand: SkillCommand = {
    name: "helloWorld",
    description: "This some super description",
    pattern: /^hello world.*/,
}

export const Skill = skill({
    
    artifacts: {
        gcf: {
            entryPoint: "entryPoint",
            memory: 512,
            runtime: SkillRuntime.NodeJs10,
            timeout: 60,
        },
    },

    resourceProviders: [{
        name: "GitHub",
        typeName: "GitHubAppResourceProvider",
    }],

    parameters: {
        test: {
            type: "multiChoice",
            description: "test",
            required: false,
            displayName: "test",
            options: [{
                value: "",
                text: "",
            }],
            defaultValues: ["bla"],
        },
        test1: {
            type: "boolean",
            description: "test",
            required: false,
            displayName: "test",
        },
    },

    commands: [HelloWorldCommand],

    subscriptions: ["graphql/subscriptions/*.graphql"],

});


