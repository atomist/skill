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

// lib
export {} from "./lib/bundle";
export { buttonForCommand, menuForCommand } from "./lib/button";
export {
    execPromise,
    spawnPromise,
    killProcess,
    SpawnPromiseOptions,
    SpawnPromiseReturns,
    WritableLog,
} from "./lib/child_process";
export {} from "./lib/context";
export {} from "./lib/function";
export { GraphQLClient, QueryOrLocation, Location } from "./lib/graphql";
export {
    Contextual,
    CommandContext,
    CommandHandler,
    Configuration,
    EventContext,
    EventHandler,
    HandlerStatus,
} from "./lib/handler";
export { HttpClient } from "./lib/http";
export { log } from "./lib/log";
export {
    CommandMessageClient,
    MessageClient,
    RequiredMessageOptions,
    MessageOptions,
    Destinations,
    SlackFileMessage,
} from "./lib/message";
export { slack } from "./lib/messages";
export {
    ParameterPrompt,
    ParametersPromptObject,
    ParameterPromptOptions,
    ParameterPromptStyle,
} from "./lib/parameter_prompt";
export { BaseParameter, Option, Options, Parameter, ParametersObjectValue, HasDefaultValue } from "./lib/parameters";
export {} from "./lib/payload";
export {
    ProjectLoader,
    CloneOptions,
    AuthenticatedRepositoryId,
    gitHubComRepository,
    RepositoryId,
    RepositoryProviderType,
} from "./lib/project";
export { DEFAULT_REDACTION_PATTERNS, redact } from "./lib/redact";
export { linkedRepositories, linkedRepository } from "./lib/repository";
export * from "./lib/resource_providers";
export {
    GitHubAppCredential,
    GitHubCredential,
    gitHubAppToken,
    gitHubUserToken,
    CredentialProvider,
    CredentialResolver,
} from "./lib/secrets";
export * from "./lib/skill";
export { runSteps, Step, StepListener } from "./lib/steps";
export { StorageProvider } from "./lib/storage";
export { guid, handleError, handleErrorSync, hideString, toArray, replacer } from "./lib/util";

// lib/project
export {} from "./lib/project/clone";
export * as git from "./lib/project/git";
export * as github from "./lib/project/github";
export {} from "./lib/project/gitStatus";
export { Project, Exec, Spawn } from "./lib/project/project";
export { cwd, globFiles, withGlobMatches } from "./lib/project/util";

// lib/scripts
export {} from "./lib/scripts/gql_fetch";
export {} from "./lib/scripts/skill_bundle";
export {} from "./lib/scripts/skill_clean";
export {} from "./lib/scripts/skill_container";
export {} from "./lib/scripts/skill_input";
export {} from "./lib/scripts/skill_invoke";
export {} from "./lib/scripts/skill_package";
export {} from "./lib/scripts/skill_register";
export {} from "./lib/scripts/skill_run";
