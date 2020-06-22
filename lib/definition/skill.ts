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

import * as fs from "fs-extra";
import * as path from "path";

export enum Category {
    Build = "BUILD",
    Chat = "CHAT",
    CodeReview = "CODE_REVIEW",
    Dependencies = "DEPENDENCIES",
    Deploy = "DEPLOY",
    DevEx = "DEVEX",
    DevOps = "DEVOPS",
    Issues = "ISSUES",
    Monitor = "MONITOR",
    Notifications = "NOTIFICATIONS",
    Security = "SECURITY",
}

export enum Technology {
    Java = "JAVA",
    Maven = "MAVEN",
    Docker = "DOCKER",
    JavaScript = "JAVASCRIPT",
    NPM = "NPM",
    Leiningen = "LEIN",
    Clojure = "CLOJURE",
    Kubernetes = "KUBERNETES",
}

export enum DispatchStyle {
    Single = "single",
    Multiple = "multiple",
}

export enum Platform {
    NodeJs10 = "nodejs10",
    Python37 = "python37",
    Go113 = "go113",
}

export interface SkillRuntime {
    entryPoint?: string;
    platform?: Platform;
    url?: string;
    memory?: number;
    timeout?: number;
}

export interface SkillPackage {
    bundle?: boolean;
    minify?: boolean;
    sourceMaps?: boolean;
}

export interface SkillContainer {
    image: string;
    args?: string[];
    command?: string[];
    env?: Array<{ name: string; value: string }>;
    workingDir?: string;
}

export interface ResourceProvider {
    description?: string;
    displayName?: string;
    maxAllowed?: number;
    minRequired?: number;
    typeName: string;
}

export enum ParameterVisibility {
    Hidden = "hidden",
    Advanced = "advanced",
    Normal = "normal",
}

export enum LineStyle {
    Single = "single",
    Multiple = "multiple",
}

export interface Parameter<T, D = any> {
    type: T;
    defaultValue?: D;
    description: string;
    displayName?: string;
    required: boolean;
    visibility?: ParameterVisibility;
}

export type BooleanParameter = Parameter<ParameterType.Boolean, boolean>;

export interface ChatChannelParameterValue {
    channelName: string;
    channelId: string;
    chatTeamId: string;
    resourceProviderId: string;
}

export interface ChatChannelsParameter
    extends Omit<Parameter<ParameterType.ChatChannels, ChatChannelParameterValue[]>, "defaultValue"> {
    maxAllowed?: number;
    minRequired?: number;
}

export interface FloatParameter extends Parameter<ParameterType.Float, number> {
    maximum?: number;
    minimum?: number;
    placeHolder?: string;
}

export interface IntParameter extends Parameter<ParameterType.Int, number> {
    maximum?: number;
    minimum?: number;
    placeHolder?: string;
}

export interface MultiChoiceParameter extends Omit<Parameter<ParameterType.MultiChoice>, "defaultValue"> {
    defaultValues?: string[];
    maxAllowed?: number;
    minRequired?: number;
    options: Array<{
        description?: string;
        text: string;
        value: string;
    }>;
}

export interface SingleChoiceParameter extends Parameter<ParameterType.SingleChoice, string> {
    maxAllowed?: number;
    minRequired?: number;
    options: Array<{
        description?: string;
        text: string;
        value: string;
    }>;
}

export type RepoFilterParameter = Omit<Parameter<ParameterType.RepoFilter>, "defaultValue" | "visibility">;

export type ScheduleParameter = Parameter<ParameterType.Schedule, string>;

export interface StringParameter extends Parameter<ParameterType.String, string> {
    lineStyle?: LineStyle;
    pattern?: string;
    placeHolder?: string;
}

export interface StringArrayParameter extends Parameter<ParameterType.StringArray, string[]> {
    maxAllowed?: number;
    minRequired?: number;
    pattern?: string;
}

export interface Named {
    name: string;
    namespace?: string;
}

export interface Metadata extends Required<Named> {
    version?: string;

    author: string;
    displayName: string;
    description: string;
    longDescription: string;
    readme?: string;
    license: string;

    categories?: Category[];
    technologies?: Technology[];

    homepageUrl: string;
    repositoryUrl: string;
    iconUrl: string;
    videoUrl?: string;
}

export enum ParameterType {
    Boolean = "boolean",
    ChatChannels = "chatChannels",
    Float = "float",
    Int = "int",
    MultiChoice = "multiChoice",
    SingleChoice = "singleChoice",
    RepoFilter = "repoFilter",
    Schedule = "schedule",
    String = "string",
    StringArray = "stringArray",
}

export type ParametersIndexType = string;
export type ParametersType = {
    [key in ParametersIndexType]?: number | boolean | string | number | string[];
};

export interface Configuration<PARAMS extends ParametersType = any> {
    dispatchStyle?: DispatchStyle;

    maxConfigurations?: number;

    runtime?: SkillRuntime;

    containers?: Record<string, SkillContainer>;

    package?: SkillPackage;

    parameters?: Record<
        keyof PARAMS,
        | BooleanParameter
        | FloatParameter
        | IntParameter
        | MultiChoiceParameter
        | SingleChoiceParameter
        | RepoFilterParameter
        | ScheduleParameter
        | StringParameter
        | StringArrayParameter
        | ChatChannelsParameter
    >;

    resourceProviders?: Record<string, ResourceProvider>;
}

export interface Command {
    name: string;
    displayName?: string;
    description: string;
    pattern: RegExp;
}

export interface Operations {
    commands?: Command[];

    subscriptions?: string[];

    signals?: string[];

    gates?: Record<string, Named[]>;

    gateSubscriptions?: Named[];
}

export type Skill<PARAMS = any> = Metadata & Configuration<PARAMS> & Operations;

export function packageJson(path = "package.json"): Metadata {
    try {
        const pj = require(path); // eslint-disable-line @typescript-eslint/no-var-requires
        const name = pj.name?.split("/");
        return {
            name: name ? (name?.length === 2 ? name[1] : name[0]) : undefined,
            namespace: name ? (name?.length === 2 ? name[0].replace(/@/g, "") : undefined) : undefined,
            displayName: pj.displayName || pj.description,
            author: typeof pj.author === "string" ? pj.author : pj.author?.name,
            description: "file://skill/description.md",
            longDescription: "file://skill/long_description.md",
            readme: "file://README.md",
            license: pj.license,
            categories: pj.categories || pj.keywords,
            technologies: pj.technologies,
            homepageUrl: pj.homepage,
            repositoryUrl: typeof pj.repository === "string" ? pj.repository : pj.repository?.url,
            iconUrl: pj.icon ? pj.icon : "file://skill/icon.svg",
        };
    } catch (e) {
        return {} as any;
    }
}

export type SkillInput<PARAMS = any> = Partial<Metadata> & Configuration<PARAMS> & Operations;

export async function skill<PARAMS = any>(
    skill: SkillInput<PARAMS> | Promise<SkillInput<PARAMS>>,
): Promise<Skill<PARAMS>> {
    // Get the directory of the calling script
    let cwd = process.cwd();
    try {
        throw new Error();
    } catch (e) {
        const stack = (await import("stack-trace")).parse(e);
        cwd = path.dirname(stack[1].getFileName());
    }

    // Merge in an existing skill.yaml file from the root of the project
    const skillYamlPath = path.join(cwd, "skill.yaml");
    let skillYaml: any = {};
    if (await fs.pathExists(skillYamlPath)) {
        const yaml = await import("js-yaml");
        skillYaml = yaml.safeLoad((await fs.readFile(skillYamlPath)).toString());
        if (skillYaml.skill) {
            skillYaml = skillYaml.skill;
        }
    }

    return {
        ...packageJson(path.join(cwd, "package.json")),
        ...(skillYaml || {}),
        ...(await skill),
    };
}