import camelCase = require("lodash.camelcase");

/**
 * Map a Datalog subscription result to a JavaScript object
 */
export function mapSubscription<T = any>(result: any[]): T {
	const mapped = {};

	const mapper = (v: any) => {
		if (isPrimitive(v)) {
			return v;
		} else if (Array.isArray(v)) {
			return v.map(vr => mapper(vr));
		} else {
			const m = {};
			for (const k in v) {
				m[nameFromKey(k)] = mapper(v[k]);
			}
			return m;
		}
	};

	result.forEach(r => {
		const value = {};
		let key;
		for (const k in r) {
			if (k === "schema/entity-type") {
				key = nameFromKey(r[k]);
			} else {
				value[nameFromKey(k)] = mapper(r[k]);
			}
		}
		if (key) {
			mapped[key] = value;
		}
	});

	return mapped as T;
}

function nameFromKey(value: string): string {
	let name;
	if (value.includes("/")) {
		name = value.split("/")[1];
	} else {
		name = value;
	}
	return camelCase(name);
}

function isPrimitive(test): boolean {
	return test !== Object(test);
}
