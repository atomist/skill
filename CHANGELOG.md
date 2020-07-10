# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased](https://github.com/atomist/skill/tree/HEAD)

### Added

-   Add options to set name and email on commit. [762d025](https://github.com/atomist/skill/commit/762d025ff6f301a0aea9e57377b1779efa018396)
-   Add signals, gates and gateSubscriptions. [5f26261](https://github.com/atomist/skill/commit/5f26261e889c905fce64c1e897dd2905b99663ac)
-   Add new invoke command. [1651e4e](https://github.com/atomist/skill/commit/1651e4e5c42dc784b077ce82d0b3fb3a43131a5a)
-   Add `index.ts` and re-structure code. [#14](https://github.com/atomist/skill/pull/14)
-   Add function to manage a GitHub check. [9ed9428](https://github.com/atomist/skill/commit/9ed942833d33c3c55ac276af4a727583fa40a5fc)
-   Add pushStrategy parameters helper. [42535da](https://github.com/atomist/skill/commit/42535da53a04b4260be82b67dea3605ced10c37d)
-   Add persistChanges helper. [1f8c8e2](https://github.com/atomist/skill/commit/1f8c8e219cd49b03be349ec8a77a8b190e9c199c)
-   Add closePullRequests helper. [882f8c1](https://github.com/atomist/skill/commit/882f8c173ffd73afaec13ad3846e7fa62c37d771)
-   Allow parameters to be passed into runSteps. [bcf1f83](https://github.com/atomist/skill/commit/bcf1f83e21bb7bd97880139af506f57222ca2404)
-   Add support for resources on docker artifacts. [d3e0eae](https://github.com/atomist/skill/commit/d3e0eae0426d7784d6b10a4f05767b8f04d6bcd2)
-   Add helper to select skill configuration for commands. [#16](https://github.com/atomist/skill/issues/16)
-   Add helper to create HandlerStatus instances. [00a6ecf](https://github.com/atomist-skills/skill/commit/00a6ecff4b07510d9452b6263898e3224c00e45b)
-   Rexport the slack-messages helpers. [c7bde59](https://github.com/atomist-skills/skill/commit/c7bde5975957b4f4d0a1e5413a98b8227a7d2983)
-   Add npmJSRegistry resource provider method. [984f406](https://github.com/atomist-skills/skill/commit/984f406b589876f3997be22b9d4b432d50ed9137)
-   GitHub Check output.summary can only have 65535 characters. [#29](https://github.com/atomist-skills/skill/issues/29)

### Changed

-   Move to skill.ts from index.ts for skill definition. [#15](https://github.com/atomist/skill/issues/15)
-   Make users and channels optional in Destinations. [d0eb283](https://github.com/atomist/skill/commit/d0eb283b368c371f5dcc8198333dd377ccad8537)
