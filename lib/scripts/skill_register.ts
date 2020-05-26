import * as fs from "fs-extra";
import * as yaml from "js-yaml";
import * as os from "os";
import * as path from "path";
import { spawnPromise } from "../child_process";
import {
    createGraphQLClient,
    GraphQLClient,
} from "../graphql";
import { error } from "../log";
import * as git from "../project/git";
import { GoogleCloudStorageProvider } from "../storage";
import { AtomistSkillInput } from "./skill_input";

export async function registerSkill(cwd: string,
                                    workspaceId: string,
                                    version?: string): Promise<void> {
    const client = createGraphQLClient(await apiKey(), workspaceId);
    const originUrl = await spawnPromise("git", ["config", "--get", "remote.origin.url"], { cwd });
    const branchName = await spawnPromise("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd });
    const giturl = (await import("git-url-parse"))(originUrl.stdout.trim());

    const status = await git.status(cwd);
    if (!status.isClean) {
        throw new Error(`Repository contains uncommitted changes. Please commit before registering.`);
    }

    const storage = new GoogleCloudStorageProvider(`gs://${workspaceId.toLowerCase()}-workspace-storage`);
    const key = `skills/${workspaceId}/${giturl.owner}/${giturl.name}/${status.sha}_local.zip`;
    const url = `gs://${workspaceId.toLowerCase()}-workspace-storage/${key}`;
    await storage.store(key, path.join(cwd, "skill", "archive.zip"));

    const ids = await loadRepoAndBranch(client, { owner: giturl.owner, name: giturl.name, branch: branchName.stdout.trim() });

    const content = (await fs.readFile(path.join(cwd, "skill", "atomist.yaml"))).toString();
    const atomistYaml: { skill: AtomistSkillInput } = yaml.safeLoad(content);

    atomistYaml.skill.artifacts.gcf[0].url = url;
    if (version) {
        atomistYaml.skill.version = version;
    } else {
        const q = await qualifier(client, { owner: giturl.owner, name: giturl.name });
        atomistYaml.skill.version = `${atomistYaml.skill.version}-${q}`;
    }
    atomistYaml.skill.branchId = ids.branchId;
    atomistYaml.skill.repoId = ids.repoId;
    atomistYaml.skill.commitSha = status.sha;

    await register(client, atomistYaml.skill);
}

const BranchQuery = `query BranchForName($name: String!, $owner: String!, $branch: String!) {
  Branch(name: $branch) {
    id
    repo(name: $name, owner: $owner) @required {
      id
    }
  }
}
`;

async function loadRepoAndBranch(client: GraphQLClient, branch: { owner: string; name: string; branch: string }): Promise<{ repoId: string; branchId: string }> {
    const result = await client.query(BranchQuery, branch);
    return {
        repoId: result.Branch[0].repo.id,
        branchId: result.Branch[0].id,
    };
}

const BuildQuery = `query BuildIdentifierForRepo(
  $owner: String!
  $name: String!
) {
  SdmBuildIdentifier {
    identifier
    id
    repo(name: [$name], owner: [$owner]) @required {
      name
      owner
      providerId
    }
  }
}
`;

const BuildMutation = `mutation StoreBuildIdentifierForRepo($identifier: String!, $name: String!, $owner: String!, $providerId: String!) {
    ingestCustomSdmBuildIdentifier(value: {identifier: $identifier, repo: {name: $name, owner: $owner, providerId: $providerId}})
}
`;

async function qualifier(client: GraphQLClient, repo: { owner: string; name: string }): Promise<string> {
    const bi = await client.query(
        BuildQuery,
        repo);
    const count = (+bi?.SdmBuildIdentifier[0]?.identifier || 0) + 1;
    await client.mutate(
        BuildMutation,
        {
            providerId: bi?.SdmBuildIdentifier[0]?.repo?.providerId,
            name: repo.name,
            owner: repo.owner,
            identifier: count.toString(),
        });
    return count.toString();
}

const RegisterSkillMutation = `mutation RegisterSkill($skill: AtomistSkillInput!) {
    registerSkill(skill: $skill) {
        id
    }
}
`;

async function register(client: GraphQLClient, skill: AtomistSkillInput): Promise<void> {
    await client.mutate(
        RegisterSkillMutation,
        {
            skill,
        },
    );
}

async function apiKey(): Promise<string> {
    let apiKey = process.env.ATOMIST_API_KEY;
    if (!apiKey) {
        const cfgPath = path.join(os.homedir(), ".atomist", "client.config.json");
        if (await fs.pathExists(cfgPath)) {
            const cfg = await fs.readJson(cfgPath);
            apiKey = cfg.apiKey;
        }
    }
    if (!apiKey) {
        error(`No API key provided. Please set 'ATOMIST_API_KEY'.`);
    }
    return apiKey;
}
