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

import * as path from "path";

export enum Category {
    Build = "BUILD",
    CodeReview = "CODE_REVIEW",
    DevEx = "DEV_EX",
    Deploy = "DEPLOY",
    Security = "SECURITY",
    Dependencies = "DEPENDENCIES",
    Notifications = "NOTIFICATIONS",
    CI = "CI",
    CD = "CD",
    Productivity = "PRODUCTIVITY",
    CodeQuality = "CODE_QUALITY",
    Chat = "CHAT",
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

export interface Parameter<T, D> {
    type: T;
    defaultValue?: D;
    description: string;
    displayName?: string;
    required: boolean;
    visibility?: ParameterVisibility;
}

export type BooleanParameter = Parameter<ParameterType.Boolean, boolean>;

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

export interface MultiChoiceParameter extends Omit<Parameter<ParameterType.MultiChoice, string>, "defaultValue"> {
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

export type RepoFilterParameter = Omit<Parameter<ParameterType.RepoFilter, any>, "defaultValue" | "visibility">;

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

export interface Metadata {

    name: string;
    namespace: string;
    version: string;

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

    parameters?: Record<keyof PARAMS, BooleanParameter |
        FloatParameter |
        IntParameter |
        MultiChoiceParameter |
        SingleChoiceParameter |
        RepoFilterParameter |
        ScheduleParameter |
        StringParameter |
        StringArrayParameter>;

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
}

export type Skill<PARAMS = any> = Metadata & Configuration<PARAMS> & Operations;

export function repoFilter(options: { required?: boolean } = { required: true }): RepoFilterParameter {
    return {
        type: ParameterType.RepoFilter,
        displayName: "Which repositories",
        description: "",
        required: options.required !== undefined ? options.required : true,
    };
}

export function packageJson(path = "package.json"): Metadata {
    const pj = require(path); // eslint-disable-line @typescript-eslint/no-var-requires
    const name = pj.name?.split("/");
    return {
        name: name.length === 2 ? name[1] : name[0],
        namespace: name.length === 2 ? name[0].replace(/@/g, "") : undefined,
        displayName: pj.description,
        version: pj.version,
        author: typeof pj.author === "string" ? pj.author : pj.author?.name,
        description: "file://skill/description.md",
        longDescription: "file://skill/long_description.md",
        readme: "file://README.md",
        license: pj.license,
        categories: pj.keywords,
        technologies: pj.technologies,
        homepageUrl: pj.homepage,
        repositoryUrl: typeof pj.repository === "string" ? pj.repository : pj.repository?.url,
        iconUrl: pj.icon ? pj.icon : "file://skill/icon.svg",
    };
}

export function skill<PARAMS = any>(skill: Partial<Metadata> & Configuration<PARAMS> & Operations,
                                    p: string = path.join(process.cwd(), "package.json")): Skill<PARAMS> {
    return {
        ...packageJson(p),
        ...skill,
    };
}


