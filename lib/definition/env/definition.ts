import { AtomistSkillInput } from "../../script/skill_input";

export function noSideCar(): AtomistSkillInput["artifacts"]["docker"][0]["env"][0] {
	return {
		name: "ATOMIST_CONTAINER_MODE",
		value: "no-sidecar",
	};
}
