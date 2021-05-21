import { fail } from "power-assert";

import { validatePath } from "../../lib/github/operation";

describe("operation", () => {
	describe("validatePath", () => {
		it("should reject empty path", () => {
			try {
				validatePath("");
				fail();
			} catch (e) {
				// this is expected
			}
		});
		it("should reject absolute path", () => {
			try {
				validatePath("/foo/bar.json");
				fail();
			} catch (e) {
				// this is expected
			}
		});
		it("should reject invalid path", () => {
			try {
				validatePath("foo&/bar%.json");
				fail();
			} catch (e) {
				// this is expected
			}
		});
		it("should accept valid path", () => {
			try {
				validatePath("foo/bar.json");
			} catch (e) {
				fail();
			}
		});
	});
});
