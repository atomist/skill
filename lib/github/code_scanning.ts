import * as fs from "fs-extra";

import { Contextual } from "../handler";
import { AuthenticatedRepositoryId } from "../repository/id";
import { GitHubAppCredential, GitHubCredential } from "../secret/provider";
import { Annotation } from "./check";
import { api } from "./operation";

/**
 * Uploads provided annotations as code scanning results to GitHub.
 * Alternatively provide a path to a valid Sarif file.
 */
export async function uploadCodeScanningResults(
	ctx: Contextual<any, any>,
	id: AuthenticatedRepositoryId<GitHubCredential | GitHubAppCredential>,
	results: Array<Annotation & { snippet?: string }> | string,
): Promise<void> {
	let sarif;
	if (typeof results === "string") {
		sarif = (await fs.readFile(results)).toString();
	} else {
		sarif = JSON.stringify({
			runs: [
				{
					tool: {
						driver: {
							name: `${ctx.skill.namespace}/${ctx.skill.name}`,
							version: ctx.skill.version,
							informationUri: ctx.audit.url,
							semanticVersion: ctx.skill.version,
						},
					},
					invocations: [
						{
							executionSuccessful: true,
							endTimeUtc: new Date().toISOString(),
						},
					],
					results: results.map(r => ({
						message: {
							text: r.message,
						},
						locations: [
							{
								physicalLocation: {
									region: {
										snippet: {
											text: r.snippet,
										},
										startLine: r.startLine,
										startColumn: r.startColumn,
										endLine: r.endLine,
										endColumn: r.endColumn,
									},
									artifactLocation: {
										uri: r.path,
									},
								},
							},
						],
					})),
				},
			],
			version: "2.1.0",
			$schema:
				"https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
		});
	}

	const zlib = await import("zlib");
	const util = await import("util");

	const zipped = (await util.promisify(zlib.gzip)(sarif)).toString("base64");

	await api(id).codeScanning.uploadSarif({
		owner: id.owner,
		repo: id.repo,
		commit_sha: id.sha,
		ref: `refs/heads/${id.branch}`,
		sarif: zipped,
		tool_name: `${ctx.skill.namespace}/${ctx.skill.name}`,
	});
}
