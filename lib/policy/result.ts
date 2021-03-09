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
	update: (state: ResultEntityState) => Promise<void>;
}

export async function start(ctx, options: { sha: string }): Promise<PolicyRun> {
	let terminated = false;
	const ownerEntity = entity<ResultOwnerEntity>("policy.result/owner", {
		name: ctx.skill.name,
		namespace: ctx.skill.namespace,
		version: ctx.skill.version,
	});
	let resultEntity = entity<ResultEntity>("policy/result", {
		sha: options.sha,
		name: ctx.skill.name,
		state: ResultEntityState.Pending,
		createdAt: new Date(),
		lastUpdated: new Date(),
		managedBy: entityRef(ownerEntity),
	});
	await ctx.datalog.transact([ownerEntity, resultEntity]);

	ctx.onComplete(async () => {
		if (!terminated) {
			resultEntity = entity<ResultEntity>("policy/result", {
				sha: options.sha,
				name: ctx.skill.name,
				state: ResultEntityState.Failure,
				lastUpdated: new Date(),
			});
			await ctx.datalog.transact([ownerEntity, resultEntity]);
			terminated = true;
		}
	});

	return {
		update: async state => {
			resultEntity = entity<ResultEntity>("policy/result", {
				sha: options.sha,
				name: ctx.skill.name,
				state,
				lastUpdated: new Date(),
			});
			await ctx.datalog.transact([ownerEntity, resultEntity]);
			terminated = true;
		},
	};
}
