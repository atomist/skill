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


