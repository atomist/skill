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

import { ResourceProvider } from "../skill";

/**
 * Create a ResourceProvider instance to use in Skill resourceProvider definitions
 */
export function resourceProvider(options: ResourceProvider): ResourceProvider {
    return {
        typeName: options.typeName,
        displayName: options.displayName,
        description: options.description || options.displayName,
        minRequired: options?.minRequired !== undefined ? options.minRequired : 0,
    };
}

/**
 * Create an ChatProvider to use in Skill resourceProvider definitions
 */
export function chat(options: Omit<ResourceProvider, "typeName"> = {}): ResourceProvider {
    return resourceProvider({ displayName: "Chat", typeName: "ChatProvider", ...options });
}

/**
 * Create an SlackResourceProvider to use in Skill resourceProvider definitions
 */
export function slack(options: Omit<ResourceProvider, "typeName"> = {}): ResourceProvider {
    return resourceProvider({ displayName: "Slack", typeName: "SlackResourceProvider", ...options });
}

/**
 * Create an MicrosoftTeamsResourceProvider to use in Skill resourceProvider definitions
 */
export function msteams(options: Omit<ResourceProvider, "typeName"> = {}): ResourceProvider {
    return resourceProvider({ displayName: "Microsoft Teams", typeName: "MicrosoftTeamsResourceProvider", ...options });
}

/**
 * Create an GitHubAppResourceProvider to use in Skill resourceProvider definitions
 */
export function gitHub(options: Omit<ResourceProvider, "typeName"> = {}): ResourceProvider {
    return resourceProvider({ displayName: "GitHub", typeName: "GitHubAppResourceProvider", ...options });
}

/**
 * Create an KubernetesClusterProvider to use in Skill resourceProvider definitions
 */
export function kubernetes(options: Omit<ResourceProvider, "typeName"> = {}): ResourceProvider {
    return resourceProvider({ displayName: "Kubernetes Cluster", typeName: "KubernetesClusterProvider", ...options });
}

/**
 * Create a GoogleCloudPlatformProvider to use in Skill resourceProvider definitions
 */
export function gcp(options: Omit<ResourceProvider, "typeName"> = {}): ResourceProvider {
    return resourceProvider({
        displayName: "Google Cloud Platform",
        typeName: "GoogleCloudPlatformProvider",
        ...options,
    });
}

/**
 * Create an DockerRegistryProvider to use in Skill resourceProvider definitions
 */
export function dockerRegistry(options: Omit<ResourceProvider, "typeName"> = {}): ResourceProvider {
    return resourceProvider({ displayName: "Docker Registry", typeName: "DockerRegistry", ...options });
}

/**
 * Create an MavenRepositoryProvider to use in Skill resourceProvider definitions
 */
export function mavenRepository(options: Omit<ResourceProvider, "typeName"> = {}): ResourceProvider {
    return resourceProvider({ displayName: "Maven Repository", typeName: "MavenRepositoryProvider", ...options });
}