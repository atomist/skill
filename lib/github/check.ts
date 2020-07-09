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

import { Endpoints } from "@octokit/types";
import { Contextual } from "../handler";
import { AuthenticatedRepositoryId } from "../repository/id";
import { GitHubAppCredential, GitHubCredential } from "../secret/provider";
import { api, formatMarkers } from "./operation";
import chunk = require("lodash.chunk");

export interface CreateCheck {
    sha: string;
    name: string;
    title: string;
    body: string;
    startedAt?: string;
}

export interface UpdateCheck {
    conclusion?: "success" | "failure" | "neutral" | "cancelled" | "skipped" | "timed_out" | "action_required";
    body?: string;
    annotations?: Array<{
        path: string;
        startLine: number;
        endLine: number;
        startColumn?: number;
        endColumn?: number;
        annotationLevel: "notice" | "warning" | "failure";
        message: string;
        title?: string;
    }>;
}

export interface Check {
    data: Endpoints["POST /repos/:owner/:repo/check-runs"]["response"]["data"];
    update: (parameters: UpdateCheck) => Promise<void>;
}

export async function createCheck(
    ctx: Contextual<any, any>,
    id: AuthenticatedRepositoryId<GitHubCredential | GitHubAppCredential>,
    parameters: CreateCheck,
): Promise<Check> {
    // Check if there is a check open with that name
    const openChecks = (
        await api(id).checks.listForRef({
            owner: id.owner,
            repo: id.repo,
            ref: parameters.sha,
            check_name: parameters.name,
            status: "in_progress",
            filter: "latest",
        })
    ).data;

    let check;
    if (openChecks.total_count === 1) {
        check = openChecks.check_runs[0];
        await api(id).checks.update({
            owner: id.owner,
            repo: id.repo,
            check_run_id: check.data.id,
            external_id: ctx.correlationId,
            details_url: ctx.audit.url,
            output: {
                title: parameters.title,
                summary: `${parameters.body}
${formatMarkers(ctx)}`,
            },
        });
    } else {
        check = await api(id).checks.create({
            owner: id.owner,
            repo: id.repo,
            head_sha: parameters.sha,
            name: parameters.name,
            started_at: parameters.startedAt || new Date().toISOString(),
            external_id: ctx.correlationId,
            details_url: ctx.audit.url,
            status: "in_progress",
            output: {
                title: parameters.title,
                summary: `${parameters.body}
${formatMarkers(ctx)}`,
            },
        });
    }
    return {
        data: check.data,
        update: async params => {
            await api(id).checks.update({
                owner: id.owner,
                repo: id.repo,
                check_run_id: check.data.id,
                conclusion: params.conclusion,
                completed_at: params.conclusion ? new Date().toISOString() : undefined,
                status: params.conclusion ? "completed" : "in_progress",
                output: {
                    title: check.data.output.title,
                    summary: params.body ? `${params.body}\n${formatMarkers(ctx)}` : check.data.output.summary,
                },
            });
            await updateAnnotation(ctx, id, check, params);
        },
    };
}

async function updateAnnotation(
    ctx: Contextual<any, any>,
    id: AuthenticatedRepositoryId<GitHubCredential | GitHubAppCredential>,
    check: Endpoints["POST /repos/:owner/:repo/check-runs"]["response"],
    parameters: UpdateCheck,
): Promise<void> {
    const gh = api(id);
    const chunks = chunk(parameters.annotations || [], 50);
    for (const chunk of chunks) {
        await gh.checks.update({
            owner: id.owner,
            repo: id.repo,
            check_run_id: check.data.id,
            output: {
                title: check.data.output.title,
                summary: parameters.body ? `${parameters.body}\n${formatMarkers(ctx)}` : check.data.output.summary,
                annotations: chunk.map(c => ({
                    annotation_level: c.annotationLevel,
                    title: c.title,
                    end_column: c.endColumn,
                    end_line: c.endLine,
                    message: c.message,
                    path: c.path,
                    start_column: c.startColumn,
                    start_line: c.startLine,
                })),
            },
        });
    }
}
