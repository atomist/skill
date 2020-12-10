/*
 * Copyright © 2020 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as pRetry from "p-retry";
import { execPromise, spawnPromise } from "../child_process";
import { debug } from "../log/index";
import { Project } from "../project/project";
import { cwd } from "../project/util";
import { Status, runStatusIn } from "./status";
import forOwn = require("lodash.forown");

/** Default name of default git remote. */
const origin = "origin";

/**
 * Git push options.  See git-push(1) for more information.
 */
export interface GitPushOptions {
	follow_tags?: boolean;
	force?: boolean;
	force_with_lease?: boolean | string;
	quiet?: boolean;
	verbose?: boolean;

	branch?: string;
}

/**
 * Init a new Git repository
 */
export async function init(projectOrCwd: Project | string): Promise<void> {
	await execPromise("git", ["init"], { cwd: cwd(projectOrCwd) });
}

/**
 * Return status information about a Git repository
 */
export async function status(projectOrCwd: Project | string): Promise<Status> {
	return runStatusIn(cwd(projectOrCwd));
}

/** Default retry options for git operations. */
const retryOptions = {
	retries: 4,
	factor: 2,
	minTimeout: 250,
	maxTimeout: 1000,
	randomize: true,
};

/** Argument to [[persistChange]]. */
export interface PersistChangeArgs {
	/**
	 * Project containing or path to cloned git repository.
	 */
	project: Project | string;
	/**
	 * Branch to commit to. If it does not exist, it is created. See
	 * [[ensureBranch]] for details.
	 */
	branch: string;
	/**
	 * Function that makes changes to the project. If it returns a
	 * string, that string is used as the commit message. If it
	 * returned `undefined`, [[message]] is used as the commit
	 * message.
	 */
	editor: (dir: string) => Promise<string | undefined>;
	/**
	 * Commit message. If [[editor]] returns a string, that takes
	 * precedence as the commit message.
	 */
	message?: string;
	/** Git commit author information. */
	author?: { login?: string; email?: string };
	/** Options to supply to `git push`. */
	options?: GitPushOptions;
}

/**
 * Execute changes on a project, commits, and then push the changes to
 * the remote. Effort is made to ensure success. The git status should
 * be clean, i.e., have no uncommited changes, when calling this
 * function.
 */
export async function persistChange(args: PersistChangeArgs): Promise<void> {
	if (!args.editor) {
		throw new Error(`No project editor provided`);
	}

	const dir = cwd(args.project);
	const stat = await status(dir);
	if (!stat.isClean) {
		throw new Error(`Git project is not clean`);
	}

	const branch = args.branch;
	await ensureBranch(args.project, branch);

	await pRetry(async () => {
		await execPromise("git", ["fetch", origin, branch], { cwd: dir });
		await execPromise("git", ["reset", "--hard", `${origin}/${branch}`], {
			cwd: dir,
		});

		const message =
			(await args.editor(dir)) ||
			args.message ||
			`Atomist skill commit\n\n[atomist:generated]`;

		await commit(args.project, message, args.author);

		await push(args.project, { ...args.options, branch });
	}, retryOptions);
}

/** [[_ensureBranch]] with retry. */
async function ensureBranch(
	projectOrCwd: Project | string,
	branch: string,
): Promise<void> {
	await pRetry(async () => _ensureBranch(projectOrCwd, branch), retryOptions);
}

/**
 * Ensure a branch exists locally and remotely. If branch exists
 * remotely, use it, resetting any local version to the remote. If it
 * does not exist remotely but does exist locally, use the local
 * branch and push it to the remote while setting the upstream. If it
 * exists neither remotely nor locally, create it and push it, setting
 * upstream.
 */
async function _ensureBranch(
	projectOrCwd: Project | string,
	branch: string,
): Promise<void> {
	const dir = cwd(projectOrCwd);
	const localExists = hasBranch(projectOrCwd, branch);
	const fetchResult = await spawnPromise("git", ["fetch", origin, branch], {
		cwd: dir,
	});
	if (fetchResult.status === 0) {
		// branch exists in remote, checkout and hard reset
		await execPromise("git", ["checkout", branch], { cwd: dir });
		await execPromise("git", ["reset", "--hard", `${origin}/${branch}`], {
			cwd: dir,
		});
	} else {
		if (
			!fetchResult.stderr.includes(
				`fatal: couldn't find remote ref ${branch}`,
			)
		) {
			throw new Error(`Failed to fetch ${origin} ${branch}`);
		}
		// branch does not exist in remote
		const checkoutArgs = localExists
			? ["checkout", branch]
			: ["checkout", "-b", branch];
		await execPromise("git", checkoutArgs, { cwd: dir });
		await execPromise("git", ["push", "--set-upstream", origin, branch], {
			cwd: dir,
		});
	}
}

/**
 * `git add .` and `git commit -m MESSAGE`
 */
export async function commit(
	projectOrCwd: Project | string,
	message: string,
	options: { name?: string; email?: string } = {},
): Promise<void> {
	const dir = cwd(projectOrCwd);
	await execPromise("git", ["add", "."], { cwd: dir });
	const env = { ...process.env };
	if (options.name) {
		env.GIT_AUTHOR_NAME = options.name;
	}
	if (options.email) {
		env.GIT_AUTHOR_EMAIL = options.email;
	}
	await execPromise("git", ["commit", "-m", message, "--no-verify"], {
		cwd: dir,
		env,
	});
}

/**
 * Check out a git ref. If checking out a commit SHA, the repo will be
 * in a detached head state. The ref must already exist.
 */
export async function checkout(
	projectOrCwd: Project | string,
	ref: string,
): Promise<void> {
	await execPromise("git", ["checkout", ref, "--"], {
		cwd: cwd(projectOrCwd),
	});
}

/**
 * Revert all changes since last commit
 */
export async function revert(projectOrCwd: Project | string): Promise<void> {
	await execPromise("git", ["clean", "-dfx"], { cwd: cwd(projectOrCwd) });
	await execPromise("git", ["checkout", "--", "."], {
		cwd: cwd(projectOrCwd),
	});
}

/**
 * Push all changes to the remote
 */
export async function push(
	projectOrCwd: Project | string,
	options?: GitPushOptions,
): Promise<void> {
	await pRetry(async () => _push(projectOrCwd, options), retryOptions);
}

/** Internal push functionality without retry. See [[push]]. */
async function _push(
	projectOrCwd: Project | string,
	options?: GitPushOptions,
): Promise<void> {
	const gitPushArgs = ["push"];
	const branch = options?.branch;
	const dir = cwd(projectOrCwd);

	forOwn(options, (v, k) => {
		if (k !== "branch") {
			const opt = k.replace(/_/g, "-");
			if (typeof v === "boolean") {
				if (v === false) {
					gitPushArgs.push(`--no-${opt}`);
				} else {
					gitPushArgs.push(`--${opt}`);
				}
			} else if (typeof v === "string") {
				gitPushArgs.push(`--${opt}=${v}`);
			}
		}
	});

	if (branch) {
		gitPushArgs.push("--set-upstream", origin, branch);
	} else {
		gitPushArgs.push(origin);
	}

	try {
		await execPromise("git", gitPushArgs, { cwd: dir });
	} catch (e) {
		debug("Push failed. Attempting pull and rebase");
		await execPromise("git", ["pull", "--rebase"], { cwd: dir });
		await execPromise("git", gitPushArgs, { cwd: dir });
	}
}

/**
 * Create branch from current HEAD.
 */
export async function createBranch(
	projectOrCwd: Project | string,
	name: string,
): Promise<void> {
	await execPromise("git", ["checkout", "-b", name], {
		cwd: cwd(projectOrCwd),
	});
}

/**
 * Check if a branch exists.
 */
export async function hasBranch(
	projectOrCwd: Project | string,
	name: string,
): Promise<boolean> {
	const result = await execPromise("git", ["branch", "--list", name], {
		cwd: cwd(projectOrCwd),
	});
	return result.stdout.trim() === name;
}

/** Set git user name and email. */
export async function setUserConfig(
	project: Project,
	name = "Atomist Bot",
	email = "bot@atomist.com",
): Promise<void> {
	await project.exec("git", ["config", "user.name", name]);
	await project.exec("git", ["config", "user.email", email]);
}

/**
 * Return changed files, including untracked file.
 */
export async function changedFiles(
	projectOrCwd: Project | string,
): Promise<string[]> {
	const changedFiles = (
		await execPromise("git", ["diff", "--name-only"], {
			cwd: cwd(projectOrCwd),
		})
	).stdout
		.split("\n")
		.map(f => f.trim())
		.filter(f => !!f && f.length > 0);
	const untrackedFiles = (
		await execPromise(
			"git",
			["ls-files", "--exclude-standard", "--others"],
			{ cwd: cwd(projectOrCwd) },
		)
	).stdout
		.split("\n")
		.map(f => f.trim())
		.filter(f => !!f && f.length > 0);
	return [...changedFiles, ...untrackedFiles].sort();
}

export async function stash(
	projectOrCwd: Project | string,
	options?: { add: boolean },
): Promise<void> {
	if (options?.add) {
		await execPromise("git", ["add", "."], { cwd: cwd(projectOrCwd) });
	}
	await execPromise("git", ["stash"], { cwd: cwd(projectOrCwd) });
}

export async function stashPop(projectOrCwd: Project | string): Promise<void> {
	await execPromise("git", ["stash", "pop"], { cwd: cwd(projectOrCwd) });
}
