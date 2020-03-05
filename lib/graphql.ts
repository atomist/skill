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
import { debug } from "./log";
import { replacer } from "./util";

const GraphQLCache = new Map<string, string>();

export interface GraphQLClient {

    query<T = any, V = any>(query: string, variables?: V): Promise<T>;

    mutate<T = any, V = any>(mutation: string, variables?: V): Promise<T>;
}

export class NodeFetchGraphQLClient implements GraphQLClient {

    constructor(private readonly apiKey: string,
                private readonly url: string) {
    }

    public async query<T>(query: string, variables?: Record<string, any>): Promise<T> {
        const f = (await import("node-fetch")).default;
        const body = JSON.stringify({
            query: await this.graphql(query, "query"),
            variables,
        });
        debug(`GraphQL query: ${body}`);
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
        debug(`GraphQL result: ${JSON.stringify(result, replacer)}`);
        if (!!result.errors) {
            throw new Error(JSON.stringify(result.errors, undefined, 2));
        }
        return result.data;
    }

    public async mutate<T>(mutation: string, variables?: Record<string, any>): Promise<T> {
        const f = (await import("node-fetch")).default;
        const body = JSON.stringify({
            query: await this.graphql(mutation, "mutation"),
            variables,
        });
        debug(`GraphQL mutation: ${body}`);
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
        debug(`GraphQL result: ${JSON.stringify(result, replacer)}`);
        if (!!result.errors) {
            throw new Error(JSON.stringify(result.errors, undefined, 2));
        }
        return result.data;
    }

    private async graphql(query: string, prefix: string): Promise<string> {
        let q = query?.trim();
        if (GraphQLCache.has(query)) {
            return GraphQLCache.get(query);
        } else if (!q.startsWith("query ") && !q.startsWith("mutation ")) {
            const p = path.join(__dirname, "..", "..", "..", "graphql", prefix);
            q = (await fs.readFile(p)).toString();
        }
        q = q.replace(/\n/g, "");
        GraphQLCache.set(query, q);
        return q;
    }
}
