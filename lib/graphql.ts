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

import { replacer } from "./util";

export interface GraphQLClient {
    query<T>(query: string, variables?: Record<string, any>): Promise<T>;

    mutate<T>(mutation: string, variables?: Record<string, any>): Promise<T>;
}

export class NodeFetchGraphQLClient implements GraphQLClient {

    constructor(private readonly apiKey: string,
                private readonly url: string) {
    }

    public async query<T>(query: string, variables?: Record<string, any>): Promise<T> {
        const f = (await import("node-fetch")).default;
        const body = JSON.stringify({
            query,
            variables,
        });
        console.log(`GraphQL query: ${body}`);
        const result = await (await f(
            this.url,
            {
                method: "post",
                body,
                headers: {
                    "authorization": `bearer ${this.apiKey}`,
                    "content-type": "application/json",
                },
            })).json();
        console.log(`GraphQL result: ${JSON.stringify(result, replacer)}`);
        if (!!result.errors) {
            throw new Error(JSON.stringify(result.errors, undefined, 2));
        }
        return result.data;
    }

    public async mutate<T>(mutation: string, variables?: Record<string, any>): Promise<T> {
        const f = (await import("node-fetch")).default;
        const body = JSON.stringify({
            query: mutation,
            variables,
        });
        console.log(`GraphQL mutation: ${body}`);
        const result = await (await f(
            this.url,
            {
                method: "post",
                body,
                headers: {
                    "authorization": `bearer ${this.apiKey}`,
                    "content-type": "application/json",
                },
            })).json();
        console.log(`GraphQL result: ${JSON.stringify(result, replacer)}`);
        if (!!result.errors) {
            throw new Error(JSON.stringify(result.errors, undefined, 2));
        }
        return result.data;
    }
}
