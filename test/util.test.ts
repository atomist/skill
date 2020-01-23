import * as assert from "assert";
import { extractParameters } from "../lib/util";

describe("util", () => {

    describe("extractParameters", () => {

        it("should extract no parameters", () => {

            const intent = "create issue";
            const args = extractParameters(intent);
            assert.deepStrictEqual(args, []);

        });

        it("should extract one parameter", () => {

            const intent = "create issue --title=Test ";
            const args = extractParameters(intent);
            assert.deepStrictEqual(args, [{ name: "title", value: "Test" }]);

        });

        it("should extract multiple parameters", () => {

            const intent = "create issue --title=Test --body='This is a Test'";
            const args = extractParameters(intent);
            assert.deepStrictEqual(args, [{ name: "title", value: "Test" }, { name: "body", value: "This is a Test" }]);

        });

        it("should extract last parameter instance from multiple instances", () => {

            const intent = "create issue --title=Test1 --body='This is a test' --title=Test2";
            const args = extractParameters(intent);
            assert.deepStrictEqual(args, [{ name: "body", value: "This is a test" }, { name: "title", value: "Test2" }]);

        });

    });
});
