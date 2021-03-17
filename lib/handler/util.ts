/*
 * Copyright © 2021 Atomist, Inc.
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

import {
	Check,
	CreateCheck,
	createCheck as raiseCheck,
	UpdateCheck,
} from "../github/check";
import { markdownLink } from "../policy/badge";
import {
	pending,
	PolicyRun,
	ResultEntitySeverity,
	ResultEntityState,
} from "../policy/result";
import { CloneOptions } from "../project/clone";
import { Project } from "../project/project";
import {
	AuthenticatedRepositoryId,
	gitHubComRepository,
	RepositoryId,
} from "../repository/id";
import { gitHubAppToken } from "../secret/resolver";
import { failure } from "../status";
import { EventContext, EventHandler, HandlerStatus } from "./handler";

export type ChainedHandler<D, C, S> = (
	context: EventContext<D, C> & { state: S },
) => Promise<void | HandlerStatus>;

/**
 * Chain a series of [[ChainedHandler]]s until the first one
 * returns a [[HandlerStatus]].
 */
export function chain<D, C, S = any>(
	...handlers: Array<ChainedHandler<D, C, S>>
): EventHandler<D, C> {
	return async (ctx: EventContext<D, C> & { state: S }) => {
		ctx.state = {} as any;
		for (const handler of handlers) {
			const result = await handler(ctx);
			if (result) {
				return result;
			}
		}
		return undefined;
	};
}

export type CreateRepositoryId<D, C> = (
	ctx: EventContext<D, C>,
) => Pick<RepositoryId, "owner" | "repo" | "sha" | "branch">;

export function createRef<D, C>(
	id: CreateRepositoryId<D, C>,
): ChainedHandler<D, C, { id: AuthenticatedRepositoryId<any> }> {
	return async ctx => {
		let repositoryId: AuthenticatedRepositoryId<any> =
			typeof id === "function" ? id(ctx) : (id as any);
		if (!repositoryId.credential) {
			const credential = await ctx.credential.resolve(
				gitHubAppToken(repositoryId),
			);
			repositoryId = gitHubComRepository({ ...repositoryId, credential });
		}
		ctx.state.id = repositoryId;
	};
}

export type CreateCloneOptions<D, C> = (
	ctx: EventContext<D, C>,
) => CloneOptions;

export function cloneRef<D, C>(
	options?: CloneOptions | CreateCloneOptions<D, C>,
): ChainedHandler<
	D,
	C,
	{ id: AuthenticatedRepositoryId<any>; project: Project }
> {
	return async ctx => {
		if (!ctx.state.id) {
			return failure(
				"'id' missing in state. Make sure to include 'createRef' in handler chain",
			);
		}
		ctx.state.project = await ctx.project.clone(
			ctx.state.id,
			typeof options === "function" ? options(ctx) : options,
		);
		return undefined;
	};
}

export type CreateCheckOptions<D, C> = (
	ctx: EventContext<D, C>,
) => Omit<CreateCheck, "sha">;

export function createCheck<D, C>(
	options: Omit<CreateCheck, "sha"> | CreateCheckOptions<D, C>,
): ChainedHandler<D, C, { id: AuthenticatedRepositoryId<any>; check: Check }> {
	return async ctx => {
		if (!ctx.state.id) {
			return failure(
				"'id' missing in state. Make sure to include 'createRef' in handler chain",
			);
		}
		const optsToUse =
			typeof options === "function" ? options(ctx) : options;
		ctx.state.check = await raiseCheck(ctx, ctx.state.id, {
			sha: ctx.state.id.sha,
			...optsToUse,
		});
		return undefined;
	};
}

export type CreatePolicyRun<D, C> = (
	ctx: EventContext<D, C>,
) => { name?: string; title: string };

export function createPolicyRun<D, C>(
	options: { name?: string; title: string } | CreatePolicyRun<D, C>,
): ChainedHandler<
	D,
	C,
	{ id: AuthenticatedRepositoryId<any>; policy: PolicyRun }
> {
	return async ctx => {
		if (!ctx.state.id) {
			return failure(
				"'id' missing in state. Make sure to include 'createRef' in handler chain",
			);
		}
		const optsToUse =
			typeof options === "function" ? options(ctx) : options;
		ctx.state.policy = await pending(ctx as any, {
			sha: ctx.state.id.sha,
			...optsToUse,
		});
		return undefined;
	};
}

export interface PolicyDetails {
	name: string;
	title: string;
	body: string;
}

function createDetails<D, C>(
	options: (ctx: EventContext<D, C>) => PolicyDetails,
): ChainedHandler<D, C, { details: PolicyDetails }> {
	return async ctx => {
		ctx.state.details = options(ctx as any);
	};
}

export function policyHandler<S, C>(parameters: {
	id: CreateRepositoryId<S, C>;
	details: (
		ctx: EventContext<S, C>,
	) => {
		name: string;
		title: string;
		body: string;
	};
	execute: (
		ctx: EventContext<S, C> & {
			state: {
				id: AuthenticatedRepositoryId<any>;
				details: PolicyDetails;
				policy: PolicyRun;
				check: Check;
			};
		},
	) => Promise<{
		state: ResultEntityState;
		severity?: ResultEntitySeverity;
		message?: string;
		body?: string;
		annotations?: UpdateCheck["annotations"];
		status: HandlerStatus;
	}>;
}): EventHandler<S, C> {
	return chain<
		S,
		C,
		{
			id: AuthenticatedRepositoryId<any>;
			details: PolicyDetails;
			check: Check;
			policy: PolicyRun;
		}
	>(
		createRef<S, C>(parameters.id),
		createDetails<S, C>(parameters.details),
		createCheck<S, C>((ctx: any) => ({
			name: ctx.state.details.name,
			title: ctx.state.details.title,
			body: ctx.state.details.body,
			reuse: true,
		})),
		createPolicyRun<S, C>((ctx: any) => ({
			name: ctx.state.details.name,
			title: ctx.state.details.title,
		})),
		async ctx => {
			const result = await parameters.execute(ctx);

			let conclusion;
			switch (result.state) {
				case ResultEntityState.Success:
					conclusion = "success";
					break;
				case ResultEntityState.Failure:
					conclusion = "action_required";
					break;
				case ResultEntityState.Neutral:
					conclusion = "neutral";
					break;
			}

			const body = `${await markdownLink({
				sha: ctx.state.id.sha,
				workspace: ctx.workspaceId,
				name: ctx.state.details.name,
				title: ctx.state.details.title,
				state: result.state,
				severity: result.severity,
			})}${result.body ? `\n\n${result.body}` : ""}`;

			await ctx.state.check.update({
				conclusion,
				body,
				annotations: result.annotations,
			});
			switch (result.state) {
				case ResultEntityState.Success:
					await ctx.state.policy.success(result.body);
					break;
				case ResultEntityState.Failure:
					await ctx.state.policy.failed(result.severity, result.body);
					break;
				case ResultEntityState.Neutral:
					await ctx.state.policy.neutral(result.body);
					break;
			}

			return result.status;
		},
	) as EventHandler<S, C>;
}
