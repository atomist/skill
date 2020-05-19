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

export enum SkillCategory {
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

export enum SkillTechnology {
    Java = "JAVA",
    Maven = "MAVEN",
    Docker = "DOCKER",
    JavaScript = "JAVASCRIPT",
    NPM = "NPM",
    Leiningen = "LEIN",
    Clojure = "CLOJURE",
    Kubernetes = "KUBERNETES",
}

export enum SkillDispatchStyle {
    Single = "single",
    Multiple = "multiple",
}

export enum SkillRuntime {
    NodeJs10 = "nodejs10",
    Python37 = "python37",
    Go113 = "go113",
}

export interface SkillArtifact {
    docker?: Array<{
        args?: string[]
        command?: string[]
        env?: Array<{
            name: string;
            value: string;
        }>
        image: string
        workingDir?: string
    }>;
    gcf?: {
        entryPoint: string;
        runtime: SkillRuntime;
        url?: string;
        memory?: number
        timeout?: number;
    };
}

export interface SkillResourceProvider {
    description?: string;
    maxAllowed?: number;
    minRequired?: number;
    name: string;
    typeName: string;
}

export enum SkillParameterVisibility {
    Hidden = "hidden",
    Advanced = "advanced",
    Normal = "normal",
}

export enum SkillSpringParameterLineStyle {
    Single = "single",
    Multiple = "multiple",
}

export interface SkillParameter<T, D> {
    type: T,
    defaultValue?: D
    description: string;
    displayName?: string;
    required: boolean;
    visibility?: SkillParameterVisibility;
}

export interface SkillBooleanParameter extends SkillParameter<"boolean", boolean> {
}

export interface SkillFloatParameter extends SkillParameter<"float", number> {
    maximum?: number;
    minimum?: number;
    placeHolder?: string;
}

export interface SkillIntParameter extends SkillParameter<"int", number> {
    maximum?: number;
    minimum?: number;
    placeHolder?: string;
}

export interface SkillMultiChoiceParameter extends Omit<SkillParameter<"multiChoice", string>, "defaultValue"> {
    defaultValues?: string[];
    maxAllowed?: number;
    minRequired?: number;
    options: Array<{
        description?: string;
        text: string;
        value: string;
    }>;
}

export interface SkillSingleChoiceParameter extends SkillParameter<"singleChoice", string> {
    maxAllowed?: number;
    minRequired?: number;
    options: Array<{
        description?: string;
        text: string;
        value: string;
    }>
}

export interface SkillRepoFilterParameter extends Omit<SkillParameter<"repoFilter", any>, "defaultValue" | "displayName" | "visibility"> {
}

export interface SkillScheduleParameter extends SkillParameter<"schedule", string> {
}

export interface SkillStringParameter extends SkillParameter<"string", string> {
    lineStyle?: SkillSpringParameterLineStyle;
    pattern?: string;
    placeHolder?: string;
}

export interface SkillMetadata {

    name: string;
    namespace: string;
    version: string;

    author: string;
    displayName?: string;
    description: string;
    longDescription: string;
    readme?: string;
    license: string;

    categories?: SkillCategory[];
    technologies?: SkillTechnology[];

    homepageUrl: string;
    repositoryUrl: string;
    iconUrl: string;
    videoUrl?: string;
}

export interface SkillConfiguration {

    dispatchStyle?: SkillDispatchStyle;

    maxConfigurations?: number;

    artifacts?: SkillArtifact;

    parameters?: Record<string, SkillBooleanParameter |
        SkillFloatParameter |
        SkillIntParameter |
        SkillMultiChoiceParameter |
        SkillSingleChoiceParameter |
        SkillRepoFilterParameter |
        SkillScheduleParameter |
        SkillStringParameter>;

    resourceProviders?: SkillResourceProvider[];
}

export interface SkillCommand {
    name: string;
    displayName?: string;
    description: string;
    pattern: RegExp;
}

export interface SkillOperations {

    commands?: SkillCommand[];

    subscriptions?: string[];
}

export type Skill = SkillMetadata & SkillConfiguration & SkillOperations;

export function packageJson(path: string = "package.json"): SkillMetadata {
    const pj = require(path);
    const name = pj.name.split("/");
    return {
        name: name.length === 2 ? name[1] : name[0],
        namespace: name.length === 2 ? name[0].replace(/@/g, "") : undefined,
        version: pj.version,
        author: typeof pj.author === "string" ? pj.author : pj.author?.name,
        description: pj.description,
        longDescription: pj.longDescription,
        license: pj.license,
        categories: pj.keywords,
        technologies: pj.technologies,
        homepageUrl: pj.homepage,
        repositoryUrl: typeof pj.repository === "string" ? pj.repository : pj.repository?.url,
        iconUrl: pj.icon,
    };
}

export function skill(skill: Partial<SkillMetadata> & SkillConfiguration & SkillOperations, path: string = "package.json"): Skill {
    return {
        ...packageJson(path),
        ...skill,
    }
}
