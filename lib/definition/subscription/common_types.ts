/*
 * Copyright © 2021 Atomist, Inc.
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

export interface Repo {
	name: string;
	defaultBranch: string;
	org: {
		installationToken: string;
		name: string;
		url: string;
		baseUrl: string;
	};
}

export interface Commit {
	sha: string;
	message: string;
	repo: Repo;
	author: {
		name: string;
		login: string;
		emails: Array<{ address: string }>;
	};
}

export interface DockerImage {
	digest: string;
	tags?: string[];
	sha: string;
	labels?: Array<{ name: string; value: string }>;
	repository: {
		host: string;
		name: string;
	};
}

export enum DockerRegistryType {
	Gcr = "GCR",
	DockerHub = "DOCKER_HUB",
}

export interface DockerRegistry {
	type: DockerRegistryType;
	secret: string;
	username: string;
	serverUrl: string;
}

export enum DockerImageVulnerabilitySeverity {
	Unspecified = "SEVERITY_UNSPECIFIED",
	Minimal = "MINIMAL",
	Low = "LOW",
	Medium = "MEDIUM",
	High = "HIGH",
	Critical = "CRITICAL",
}

export interface DockerImageVulnerability {
	sourceId: string;
	severity: DockerImageVulnerabilitySeverity;
	title: string;
	description: string;
	cvssScore: string;
	fixAvailable: boolean;
	affected: Array<{ name: string; version: string }>;
	fixed: Array<{ name: string; version: string }>;
}

export enum DockerAnalysisDiscoverySource {
	Gcr = "GCR",
	Trivy = "TRIVY",
}

export enum DockerAnalysisDiscoveryStatus {
	Pending = "PENDING",
	Scanning = "SCANNING",
	FinishedSuccess = "FINISHED_SUCCESS",
	FinishedFailed = "FINISHED_FAILED",
	FinishedUnsupported = "FINISHED_UNSUPPORTED",
	Unspecified = "ANALYSIS_STATUS_UNSPECIFIED",
}

export type DockerImageWithVulnerabilities = DockerImage & {
	layers: Array<{
		blob: {
			digest: string;
			vulnerabilities: Array<{ sourceId: string }>;
			createdBy: Array<{
				file: {
					path: string;
					sha: string;
				};
				number: number;
				instruction: string;
				argsMap: Record<string, string>;
				argsArray: string[];
				argsString: string;
			}>;
		};
	}>;
	repository: { baseline: Array<{ cves: DockerImageVulnerability[] }> };
	vulnerabilities: DockerImageVulnerability[];
	dockerFile: {
		path: string;
		sha: string;
	};
};

/**
 * Subscription type to be used with the onDockerImage datalog subscription
 */
export interface OnDockerImage {
	commit: Commit;
	image: DockerImage[];
	registry: DockerRegistry;
}

/**
 * Subscription type to be used with the onDockerFile datalog subscription
 */
export interface OnDockerFile {
	commit: Commit;
	image: DockerImage;
	registry: DockerRegistry;
	file: {
		path: string;
		sha: string;
		lines: Array<{
			number: number;
			instruction: string;
			argsMap: Record<string, string>;
			argsArray: string[];
			argsString: string;
		}>;
	};
}

/**
 * Subscription type to be used with the onDockerAnalysisComplete datalog subscription
 */
export interface OnDockerAnalysisComplete {
	discovery: {
		status: DockerAnalysisDiscoveryStatus;
		source: DockerAnalysisDiscoverySource;
	};
	commit: Commit;
	image: DockerImageWithVulnerabilities | DockerImageWithVulnerabilities[];
}
