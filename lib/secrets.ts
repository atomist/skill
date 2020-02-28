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

import { GraphQLClient } from "./graphql";
import {
    CommandIncoming,
    EventIncoming,
    isCommandIncoming,
} from "./payload";

export type CredentialResolver<T> = (graphClient: GraphQLClient, payload: CommandIncoming | EventIncoming) => Promise<T>;

export interface GitHubCredential {
    token: string;
    scopes: string[];
}

export interface GitHubAppCredential {
    token: string;
    permissions: Record<string, "write" | "read">;
}

export function isGitHubCredential(spec: any): spec is GitHubCredential {
    return !!spec.token && !!spec.scopes;
}

export function isGitHubAppCredential(spec: any): spec is GitHubAppCredential {
    return !!spec.token && !!spec.permissions;
}

const ResourceUserQuery = `query ResourceUser($id: String!) {
  ChatId(userId: $id) {
    person {
      gitHubId {
        login
        credential {
          secret
          scopes
        }
      }
    }
  }
}
`;

interface ResourceUserResponse {
    ChatId: Array<{
        person: {
            gitHubId: {
                credential: {
                    scopes: string[];
                    secret: string;
                };
            };
        };
    }>;
}

export function gitHubUserToken(...scopes: string[]): CredentialResolver<GitHubCredential> {
    return async (graph, payload) => {
        if (isCommandIncoming(payload)) {
            const chatId = payload.source?.slack?.user?.id;
            if (!!chatId) {
                const response = await graph.query<ResourceUserResponse>(ResourceUserQuery, { id: chatId });
                const credential = response?.ChatId[0]?.person?.gitHubId?.credential;

                // TODO cd check scopes

                if (!!credential) {
                    return {
                        scopes: credential.scopes,
                        token: credential.secret,
                    };
                }
            }
        }
        return undefined;
    };
}

const ProviderQuery = `query Provider($owner: String, $repo: String, $apiUrl: String) {
  Repo(owner: $owner, name: $repo) {
    org @required {
      provider(apiUrl: $apiUrl) @required {
        id
      }
    }
  }
}
`;

const ProviderByRepoIdQuery = `query ProviderByRepoId($id: ID!) {
  Repo(id: $id) {
    org @required {
      provider @required {
        id
      }
    }
  }
}
`;

interface ProviderResponse {
    Repo: Array<{
        org: {
            provider: {
                id: string,
            },
        },
    }>;
}

const GitHubAppTokenQuery = `query GitHubAppToken($id: ID!, $owner: String!) {
  GitHubAppResourceProvider(id: $id) {
    gitHubAppInstallations(owner: $owner) {
      token {
        secret
        permissions
      }
    }
  }
}
`;

interface GitHubAppTokenResponse {
    GitHubAppResourceProvider: Array<{
        gitHubAppInstallations: Array<{
            token: {
                permissions: string,
                secret: string,
            },
        }>,
    }>;
}

const ScmProviderQuery = `query ScmProvider($id: ID!) {
  SCMProvider(id: $id) {
    credential {
      secret
      scopes
    }
  }
}`;

interface ScmProviderResponse {
    SCMProvider: Array<{
        credential: {
            secret: string,
            scopes: string[],
        },
    }>;
}

export function gitHubAppToken(id: { owner: string, repo: string, apiUrl?: string } | string): CredentialResolver<GitHubAppCredential | GitHubCredential> {
    return async graph => {
        let repo;
        let owner;
        let apiUrl;
        let providerId;
        if (typeof id === "string") {
            const provider = await graph.query<ProviderResponse>(
                ProviderByRepoIdQuery,
                { id },
            );
            providerId = provider?.Repo[0]?.org?.provider?.id;
        } else {
            repo = id.repo;
            owner = id.owner;
            apiUrl = id.apiUrl;
            const provider = await graph.query<ProviderResponse>(
                ProviderQuery,
                { apiUrl: apiUrl || "https://api.github.com/", owner, repo },
            );
            providerId = provider?.Repo[0]?.org?.provider?.id;
        }

        if (!!providerId) {
            const installations = await graph.query<GitHubAppTokenResponse>(GitHubAppTokenQuery, {
                id: providerId,
                owner,
            });
            const token = installations?.GitHubAppResourceProvider[0]?.gitHubAppInstallations[0].token;
            if (!!token) {
                return {
                    token: token.secret,
                    permissions: JSON.parse(token.permissions || ""),
                };
            }
            // Fallback to old SCMProvider for backwards compatibility
            const scmProvider = await graph.query<ScmProviderResponse>(ScmProviderQuery, { id: providerId });
            const credential = scmProvider?.SCMProvider[0]?.credential;
            if (!!credential) {
                return {
                    token: credential.secret,
                    scopes: credential.scopes,
                };
            }
        }
        return undefined;
    };
}

export interface CredentialProvider {
    resolve<T>(spec: CredentialResolver<T>): Promise<T | undefined>;
}

export class DefaultCredentialProvider implements CredentialProvider {

    constructor(private readonly graphClient: GraphQLClient,
                private readonly payload: CommandIncoming | EventIncoming) {
    }

    public async resolve<T>(spec: CredentialResolver<T>): Promise<T> {
        return spec(this.graphClient, this.payload);
    }
}
