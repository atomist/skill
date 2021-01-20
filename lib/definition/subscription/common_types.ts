export interface Repo {
	name: string;
	org: {
		installationToken: string;
		name: string;
		url: string;
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
	image: string;
	tags?: string[];
	labels?: Array<{ name: string; value: string }>;
	repository: {
		host: string;
		name: string;
	};
}

export interface DockerRegistry {
	type: string;
	secret: string;
	username: string;
	serverUrl: string;
}

/**
 * Subscription type to be used with the onDockerImage datalog subscription
 */
export interface OnDockerImage {
	commit: Commit;
	image: DockerImage;
	registry: DockerRegistry;
}
