import { PushStrategy } from "../definition/parameter/definition";
import * as git from "../git/operation";
import { Contextual, HandlerStatus } from "../handler";
import { Project } from "../project/project";
import { api, formatMarkers } from "./operation";

export async function persistChanges(
    ctx: Contextual<any, any>,
    project: Project,
    strategy: PushStrategy,
    push: { branch: string; defaultBranch: string; author: { login: string; name?: string; email?: string } },
    pullRequest: { title: string; body: string; branch: string; labels?: string[] },
    commit: { message: string },
): Promise<HandlerStatus> {
    if ((await git.status(project)).isClean) {
        return {
            code: 0,
            reason: `No changes to push`,
        };
    }

    const commitOptions = {
        name: push.author.name,
        email: push.author.email,
    };
    const repoUrl = `https://github.com/${project.id.owner}/${project.id.repo}`;

    if (
        strategy === "pr" ||
        (push.branch === push.defaultBranch && (strategy === "pr_default" || strategy === "pr_default_commit"))
    ) {
        const changedFiles = (await project.exec("git", ["diff", "--name-only"])).stdout
            .split("\n")
            .map(f => f.trim())
            .filter(f => !!f && f.length > 0);
        const body = `${pullRequest.body}

${changedFiles.map(f => ` * \`${f}\``).join("\n")}
${formatMarkers(ctx)}
`;

        await git.createBranch(project, pullRequest.branch);
        await git.commit(project, commit.message, commitOptions);
        await git.push(project, { force: true, branch: pullRequest.branch });

        try {
            let pr;
            const gh = api(project.id);
            const openPrs = (
                await gh.pulls.list({
                    owner: project.id.owner,
                    repo: project.id.repo,
                    state: "open",
                    base: push.branch,
                    head: `${project.id.owner}:${pullRequest.branch}`,
                    per_page: 100,
                })
            ).data;
            if (openPrs.length === 1) {
                pr = openPrs[0];
                await gh.pulls.update({
                    owner: project.id.owner,
                    repo: project.id.repo,
                    pull_number: pr.number,
                    body,
                });
            } else {
                pr = (
                    await gh.pulls.create({
                        owner: project.id.owner,
                        repo: project.id.repo,
                        title: pr.title,
                        body,
                        base: push.branch,
                        head: pullRequest.branch,
                    })
                ).data;
                if (pullRequest.labels?.length > 0) {
                    await gh.issues.update({
                        owner: project.id.owner,
                        repo: project.id.repo,
                        issue_number: pr.number,
                        labels: pullRequest.labels,
                    });
                }
            }
            await gh.pulls.createReviewRequest({
                owner: project.id.owner,
                repo: project.id.repo,
                pull_number: pr.number,
                reviewers: [push.author.login],
            });
            return {
                code: 0,
                reason: `Pushed to [${project.id.owner}/${project.id.repo}/${pullRequest.branch}](${repoUrl}) and raised PR [#${pr.number}](${pr.html_url})`,
            };
        } catch (e) {
            // This might fail if the PR already exists
        }
        return {
            code: 0,
            reason: `Pushed to [${project.id.owner}/${project.id.repo}/${pullRequest.branch}](${repoUrl})`,
        };
    } else if (
        strategy === "commit" ||
        (push.branch === push.defaultBranch && strategy === "commit_default") ||
        (push.branch !== push.defaultBranch && strategy === "pr_default_commit")
    ) {
        await git.commit(project, commit.message, commitOptions);
        await git.push(project);
        return {
            code: 0,
            reason: `Pushed to [${project.id.owner}/${project.id.repo}/${push.branch}](${repoUrl})`,
        };
    }
    return {
        code: 0,
        reason: `Not pushed because of selected push strategy`,
    };
}
