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

import { RestEndpointMethodTypes } from "@octokit/plugin-rest-endpoint-methods/dist-types/generated/parameters-and-response-types";
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
	conclusion?:
		| "success"
		| "failure"
		| "neutral"
		| "cancelled"
		| "skipped"
		| "timed_out"
		| "action_required";
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
	actions?: Array<{
		label: string;
		description: string;
		identifier: string;
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
	let terminated = false;
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

	ctx.onComplete(async () => {
		if (!terminated && check) {
			await api(id).checks.update({
				owner: id.owner,
				repo: id.repo,
				check_run_id: check.data.id,
				conclusion: "failure",
				completed_at: new Date().toISOString(),
				status: "completed",
			});
			terminated = true;
		}
	});

	let check: RestEndpointMethodTypes["checks"]["create"]["response"];
	if (openChecks.total_count === 1) {
		check = await api(id).checks.update({
			owner: id.owner,
			repo: id.repo,
			check_run_id: openChecks.check_runs[0].id,
			external_id: ctx.correlationId,
			details_url: ctx.audit.url,
			output: {
				title: parameters.title,
				summary: truncateText(
					`${parameters.body}\n${formatMarkers(ctx)}`,
				),
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
				summary: truncateText(
					`${parameters.body}\n${formatMarkers(ctx)}`,
				),
			},
		});
	}
	return {
		data: check.data,
		update: async params => {
			if (params.conclusion) {
				terminated = true;
			}
			await api(id).checks.update({
				owner: id.owner,
				repo: id.repo,
				check_run_id: check.data.id,
				conclusion: params.conclusion,
				completed_at: params.conclusion
					? new Date().toISOString()
					: undefined,
				status: params.conclusion ? "completed" : "in_progress",
				output: {
					title: check.data.output.title,
					summary: truncateText(
						params.body
							? `${params.body}\n${formatMarkers(ctx)}`
							: check.data.output.summary,
					),
				},
				actions: params.actions,
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
				summary: truncateText(
					parameters.body
						? `${parameters.body}\n${formatMarkers(ctx)}`
						: check.data.output.summary,
				),
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

export function truncateText(text: string, length = 65535): string {
	const ellipsis = " ... ";
	if (text.length <= length) {
		return text;
	} else {
		const partLength = Math.floor((length - ellipsis.length) / 2);
		return (
			text.slice(0, partLength) + ellipsis + text.slice(-1 * partLength)
		);
	}
}
