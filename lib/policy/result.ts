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

import { entity, entityRef } from "../datalog/util";

export enum ResultEntityState {
	Pending = ":policy.result.state/PENDING",
	Success = ":policy.result.state/SUCCESS",
	Failure = ":policy.result.state/FAILURE",
	Neutral = ":policy.result.state/NEUTRAL",
}

export type ResultEntity = {
	sha: string;
	name: string;
	state: ResultEntityState;
	managedBy?: string;
	createdAt?: Date;
	lastUpdated: Date;
};

export type ResultOwnerEntity = {
	name: string;
	namespace: string;
	version: string;
};

export interface PolicyRun {
	failed: () => Promise<void>;
	neutral: () => Promise<void>;
	success: () => Promise<void>;
}

export async function pending(
	ctx,
	parameters: { name?: string; sha: string },
): Promise<PolicyRun> {
	let terminated = false;
	const ownerEntity = entity<ResultOwnerEntity>("policy.result/owner", {
		name: ctx.skill.name,
		namespace: ctx.skill.namespace,
		version: ctx.skill.version,
	});
	let resultEntity = entity<ResultEntity>("policy/result", {
		sha: parameters.sha,
		name: parameters.name || ctx.skill.name,
		state: ResultEntityState.Pending,
		createdAt: new Date(),
		lastUpdated: new Date(),
		managedBy: entityRef(ownerEntity),
	});
	await ctx.datalog.transact([ownerEntity, resultEntity]);

	const update = (state: ResultEntityState) => async () => {
		resultEntity = entity<ResultEntity>("policy/result", {
			sha: parameters.sha,
			name: ctx.skill.name,
			state,
			lastUpdated: new Date(),
		});
		await ctx.datalog.transact([ownerEntity, resultEntity]);
		terminated = true;
	};

	ctx.onComplete(async () => {
		if (!terminated) {
			await update(ResultEntityState.Failure);
		}
	});

	return {
		failed: update(ResultEntityState.Failure),
		neutral: update(ResultEntityState.Neutral),
		success: update(ResultEntityState.Success),
	};
}
