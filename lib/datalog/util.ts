import kebabcase = require("lodash.kebabcase");

export function entity(
	type: string,
	attributes: Record<
		string,
		string | number | boolean | Date | { set: string[] } | { add: string[] }
	>,
	name?: string,
): any {
	const e = {
		"schema/entity-type": `:${type}`,
	};
	if (name) {
		e["schema/entity"] = name;
	}
	const prefix = type.replace(/\//g, ".");
	for (const attribute of Object.keys(attributes)) {
		if (attribute.includes("/")) {
			e[attribute] = attributes[attribute];
		} else {
			e[kebabcase(`${prefix}/${attribute}`)] = attributes[attribute];
		}
	}
	return e;
}
