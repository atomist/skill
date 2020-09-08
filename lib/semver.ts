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

/**
 * Return true if provided tag is a release semantic version.
 */
export function isReleaseSemVer(tag: string): boolean {
	const releaseSemVerRegExp = /^v?(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/;
	return releaseSemVerRegExp.test(tag);
}

/**
 * Clean up the tag, returning just the semantic version.
 */
export function cleanSemVer(tag: string): string {
	return tag.replace(/^v/, "");
}

/**
 * Return a function that tags a tag and returns true if tag is a
 * pre-release semantic version matching the provided release semantic
 * version.
 */
function isMatchingPreReleaseSemanticVersion(
	release: string,
): (t: string) => boolean {
	const releaseRegExp = new RegExp(`^v?${release}-`);
	return (t: string): boolean => {
		return releaseRegExp.test(t);
	};
}

/**
 * Return subset of tags that are pre-release semantic versions
 * matching the provided release semantic version.
 */
export function matchingPreReleaseSemanticVersions(
	release: string,
	tags: string[],
): string[] {
	return tags.filter(isMatchingPreReleaseSemanticVersion(release));
}
