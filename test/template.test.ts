import * as assert from "assert";

import { render } from "../lib/template";

describe("template", () => {
	it("should render simple template", async () => {
		const result = await render("test", {
			firstname: "Mickey",
			lastname: "Mouse",
			author: true,
			color: ["blue", "orange", "red"],
		});
		assert.deepStrictEqual(
			result,
			`Hello Mickey Mouse
 * \`blue\` [test](google.com)
 * \`orange\` [test](google.com)
 * \`red\` [test](google.com)
`,
		);
	});
});
