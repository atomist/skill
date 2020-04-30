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

export interface Option {
    value: string;
    description?: string;
}

/**
 * Represents a selection of exactly one or some strings from a fixed list of options
 */
export interface Options {

    /**
     * Whether the user must select exactly one option. In this case,
     * binds to string. Otherwise binds to string[]
     */
    kind?: "single" | "multiple";

    /**
     * Possible options to select from
     */
    options?: Option[];
}

/**
 * Constant for "freeChoices" type. Indicates that valid input is any number of strings, without validation.
 * Useful in accepting input from other systems that perform their own validation.
 * Binds to string[].
 */
export const FreeChoices = "freeChoices";

// tslint:disable-next-line:deprecation
export type ParameterType = "string" | "number" | "boolean" |  Options;

export interface BaseParameter {
    readonly pattern?: RegExp;
    readonly required?: boolean;
    readonly description?: string;
    readonly displayName?: string;
    readonly validInput?: string;
    readonly displayable?: boolean;
    readonly maxLength?: number;
    readonly minLength?: number;
    readonly type?: ParameterType;
    readonly order?: number;
    readonly control?: "input" | "textarea";
}

export interface Parameter extends BaseParameter {
    readonly name: string;
    // readonly default?: string;
}

export interface BaseValue {
    path: string;
    required?: boolean;
    type?: "string" | "number" | "boolean";
}

export type Parameters<PARAMS = any> = ParametersListing | ParametersObject<PARAMS>;

/**
 * Interface mixed in with BaseParameter to allow adding a default value to a parameter.
 * When the class-style decorated approach is used, this is unnecessary as any field
 * value will be used as a default.
 */
export interface HasDefaultValue { defaultValue?: any }

export type ParametersObjectValue = (BaseParameter & HasDefaultValue);

export type MappedParameterOrSecretObjectValue = MappedParameterOrSecretDeclaration;

export type ValueParameterObjectValue = ValueDeclaration;

/**
 * Object with properties defining parameters, secrets, mapped parameters and values.
 * Useful for combination via spreads.
 */
export type ParametersObject<PARAMS, K extends keyof PARAMS = keyof PARAMS>
    = Record<K, ParametersObjectValue | MappedParameterOrSecretObjectValue | ValueParameterObjectValue>;

export enum DeclarationType {
    /**
     * @deprecated use Mapped
     */
    mapped = "mapped",
    /**
     * @deprecated use Secret
     */
    secret = "secret",

    Mapped = "mapped",
    Secret = "secret",
}

export interface MappedParameterOrSecretDeclaration {

    declarationType: DeclarationType;

    uri: string;
    /**
     * Only valid on mapped parameters
     */
    required?: boolean;
}

/**
 * Define values to be injected from the SDM configuration
 */
export type ValueDeclaration = BaseValue;

/**
 * Define parameters used in a command
 */
export interface ParametersListing {

    readonly parameters: NamedParameter[];

    readonly mappedParameters: NamedMappedParameter[];

    readonly secrets: NamedSecret[];

    readonly values: NamedValue[];
}

export type NamedParameter = BaseParameter & { name: string } & HasDefaultValue;

export interface NamedSecret {
    name: string;
    uri: string;
}

export interface NamedMappedParameter {
    name: string;
    uri: string;
    required?: boolean;
}

export type NamedValue = NamedValueParameter;

export interface NamedValueParameter extends BaseValue {
    name: string;
}
