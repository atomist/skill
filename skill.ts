import { registerEvent } from "./lib/bundle";
export const entryPoint = require("@atomist/skill/lib/bundle").bundle;

registerEvent("name", async () => (await import("./lib/graphql")).createGraphQLClient );
