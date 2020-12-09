import { OnAttachmentActionSubscription } from "./definition/subscription/typings/types";
import { processCommand } from "./function";
import { EventHandler } from "./handler";
import { CommandIncoming } from "./payload";
import { handlerLoader } from "./util";

export function eventHandlerLoader<EventHandler>(type: string) {
	const hl = handlerLoader<EventHandler>(type);
	return async (name: string, cwd?: string): Promise<EventHandler> => {
		if (name === "onAttachmentAction") {
			return onAttachmentAction as any;
		} else {
			return hl(name, cwd);
		}
	};
}

const UpdateTaskStateMutation = `mutation updateTaskState($id: ID!, $state: AtmJobTaskState!){
  setAtmJobTaskState(id: $id, jobTaskState: { state: $state }) {
    id
  }
}`;

const onAttachmentAction: EventHandler<
	OnAttachmentActionSubscription,
	any
> = async ctx => {
	const trigger = ctx.trigger;
	const task = ctx.data.AtmJobTask?.[0];

	const data: {
		configuration: string;
		payload: CommandIncoming;
	} = JSON.parse(task.data);

	const payload = data.payload;
	payload.skill = trigger.skill;
	payload.secrets = trigger.secrets;

	try {
		const result = await processCommand(payload, {
			eventId: ctx.executionId,
		});
		await ctx.graphql.mutate(UpdateTaskStateMutation, {
			id: task.id,
			state: "success",
		});
		return result;
	} catch (e) {
		await ctx.graphql.mutate(UpdateTaskStateMutation, {
			id: task.id,
			state: "failed",
		});
		throw e;
	}
};
