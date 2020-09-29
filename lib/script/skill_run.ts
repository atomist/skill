import * as fs from "fs-extra";
import * as yaml from "js-yaml";
import * as os from "os";
import * as path from "path";
import { captureLog, spawnPromise } from "../child_process";
import { guid } from "../util";
import { AtomistSkillInput } from "./skill_input";

export async function runSkill(options: {
	cwd: string;
	repo?: string;
	event?: string;
	skill: string;
}): Promise<void> {
	const content = (
		await fs.readFile(path.join(options.cwd, options.skill))
	).toString();
	const atomistYaml: { skill: AtomistSkillInput } = yaml.safeLoad(
		content,
	) as any;
	const artifact = atomistYaml.skill.artifacts.docker[0];
	const correlationId = guid().slice(0, 7);

	const wd = path.join(
		os.homedir(),
		".atomist",
		"skill",
		atomistYaml.skill.namespace,
		atomistYaml.skill.name,
		correlationId,
	);
	const inputD = path.join(wd, "input");
	const outputD = path.join(wd, "output");
	const matchersD = path.join(outputD, "matchers");
	const messagesD = path.join(outputD, "messages");
	await fs.ensureDir(wd);
	await fs.ensureDir(inputD);
	await fs.ensureDir(outputD);
	await fs.ensureDir(matchersD);
	await fs.ensureDir(messagesD);

	if (options.event) {
		await fs.copyFile(options.event, path.join(wd, "payload.json"));
	} else {
		try {
			const event = await fs.readFileSync(0, "utf-8");
			await fs.writeFile(path.join(wd, "payload.json"), event);
		} catch (e) {
			throw new Error("No event payload detected");
		}
	}

	const args = ["run", "-i", "--rm"];
	if (artifact.name) {
		args.push("--name", `${artifact.name}-${correlationId}`);
	}
	(artifact.env || []).forEach(e =>
		args.push("-e", `${e.name}='${e.value}'`),
	);

	args.push("-e", "ATOMIST_HOME=atm/home");
	args.push("-e", "ATOMIST_PAYLOAD=/atm/payload.json");
	args.push("-e", "ATOMIST_INPUT_DIR=/atm/input");
	args.push("-e", "ATOMIST_OUTPUT_DIR=/atm/output");
	args.push("-e", "ATOMIST_MATCHERS_DIR=/atm/output/matchers");
	args.push("-e", "ATOMIST_MESSAGES_DIR=/atm/output/messages");
	args.push("-e", "ATOMIST_STATUS=/atm/output/status.json");
	args.push("-e", "ATOMIST_PUSH=/atm/output/push.json");
	args.push("-e", "ATOMIST_WORKSPACE_ID");
	args.push("-e", `ATOMIST_CORRELATION_ID=${correlationId}`);
	args.push(
		"-e",
		"ATOMIST_GRAPHQL_ENDPOINT=https://automation.atomist.com/graphql",
	);
	if (artifact.workingDir) {
		args.push("-w", artifact.workingDir);
	}
	if (artifact.command?.length > 0) {
		args.push("--entrypoint", artifact.command[0]);
	}
	if (options.repo) {
		args.push("-v", `${options.repo}:/atm/home`);
	}
	args.push("-v", `${wd}:/atm`);

	args.push(artifact.image);
	args.push(...(artifact.args || []));

	await spawnPromise("docker", args, {
		logCommand: false,
		log: captureLog(),
	});
}
