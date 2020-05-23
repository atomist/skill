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

export interface ResourceProvider {
    description?: string;
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

export type RepoFilterParameter = Omit<Parameter<ParameterType.RepoFilter, any>, "defaultValue" | "description" | "visibility">;

export type ScheduleParameter = Parameter<ParameterType.Schedule, string>;

export interface StringParameter extends Parameter<ParameterType.String, string> {
    lineStyle?: LineStyle;
    pattern?: string;
    placeHolder?: string;
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
    "Schedule" = "schedule",
    "String" = "string",
}

export interface Configuration {

    dispatchStyle?: DispatchStyle;

    maxConfigurations?: number;

    runtime?: SkillRuntime;

    parameters?: Record<string, BooleanParameter |
        FloatParameter |
        IntParameter |
        MultiChoiceParameter |
        SingleChoiceParameter |
        RepoFilterParameter |
        ScheduleParameter |
        StringParameter>;

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

export type Skill = Metadata & Configuration & Operations;

export function packageJson(path = "package.json"): Metadata {
    const pj = require(path);
    const name = pj.name.split("/");
    return {
        name: name.length === 2 ? name[1] : name[0],
        namespace: name.length === 2 ? name[0].replace(/@/g, "") : undefined,
        displayName: pj.description,
        version: pj.version,
        author: typeof pj.author === "string" ? pj.author : pj.author?.name,
        description: "file://docs/description.md",
        longDescription: "file://docs/long_description.md",
        readme: "file://README.md",
        license: pj.license,
        categories: pj.keywords,
        technologies: pj.technologies,
        homepageUrl: pj.homepage,
        repositoryUrl: typeof pj.repository === "string" ? pj.repository : pj.repository?.url,
        iconUrl: pj.icon ? pj.icon : "file://docs/images/icon.svg",
    };
}

export function skill(skill: Partial<Metadata> & Configuration & Operations,
                      p: string = path.join(process.cwd(), "package.json")): Skill {
    return {
        ...packageJson(p),
        ...skill,
    };
}


