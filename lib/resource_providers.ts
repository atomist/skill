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

import { ResourceProvider } from "./skill";

/**
 * Create an SlackResourceProvider to use in a Skill resourceProvider definitions
 */
export function slackResourceProvider(options: Omit<ResourceProvider, "typeName"> = {}): ResourceProvider {
    return resourceProvider({ displayName: "Slack", typeName: "SlackResourceProvider", ...options });
}

/**
 * Create an GitHubAppResourceProvider to use in a Skill resourceProvider definitions
 */
export function gitHubResourceProvider(options: Omit<ResourceProvider, "typeName"> = {}): ResourceProvider {
    return resourceProvider({ displayName: "GitHub", typeName: "GitHubAppResourceProvider", ...options });
}

/**
 * Create an KubernetesClusterProvider to use in a Skill resourceProvider definitions
 */
export function kubernetesResourceProvider(options: Omit<ResourceProvider, "typeName"> = {}): ResourceProvider {
    return resourceProvider({ displayName: "Kubernetes Cluster", typeName: "KubernetesClusterProvider", ...options });
}

/**
 * Create a GoogleCloudPlatformProvider to use in a Skill resourceProvider definitions
 */
export function gcpResourceProvider(options: Omit<ResourceProvider, "typeName"> = {}): ResourceProvider {
    return resourceProvider(
      { displayName: "Google Cloud Platform", typeName: "GoogleCloudPlatformProvider", ...options });
}

/**
 * Create an DockerRegistryProvider to use in a Skill resourceProvider definitions
 */
export function dockerRegistryProvider(options: Omit<ResourceProvider, "typeName"> = {}): ResourceProvider {
    return resourceProvider({ displayName: "Docker Registry", typeName: "DockerRegistryProvider", ...options });
}

export function resourceProvider(options: ResourceProvider): ResourceProvider {
    return {
        typeName: options.typeName,
        displayName: options.displayName,
        description: options.description,
        minRequired: options?.minRequired !== undefined ? options.minRequired : 0,
    };
}
