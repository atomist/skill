# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased](https://github.com/atomist/skill/compare/0.2.0...HEAD)

### Fixed

-   Remove debug logs. [8b8d0b5](https://github.com/atomist-skills/skill/commit/8b8d0b595b64e02a9c04073b8ddeb8a4fdbe78cc)

## [0.2.0](https://github.com/atomist/skill/compare/0.1.0...0.2.0) - 2020-09-26

### Added

-   Add cache support for store and restore file caches. [fc4c69c](https://github.com/atomist-skills/skill/commit/fc4c69c321fdfc4d54e5fa993636710edebf3ecd)
-   Export generated types for named triggers. [8ac07c7](https://github.com/atomist-skills/skill/commit/8ac07c77dbb4355bdde8114100c693ecff2156d2)
-   Allow individual commits with persistChanges. [dfa359c](https://github.com/atomist-skills/skill/commit/dfa359c5d848d291babf05a8408f3c15305bcd63)

### Changed

-   Remove undefined return value from steps. [9dc52c3](https://github.com/atomist-skills/skill/commit/9dc52c3b827d692672dfa04d4367d4776d431d01)
-   Consider increasing default runtime memory. [#67](https://github.com/atomist-skills/skill/issues/67)

### Fixed

-   Don't fail on non existing fragments. [dbcb33b](https://github.com/atomist-skills/skill/commit/dbcb33bf2d2cdfc3fb024b51184f881cfe1d3e10)

## [0.1.0](https://github.com/atomist/skill/tree/0.1.0)

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
-   Add matchesFilter helper for repository filtering. [522afd6](https://github.com/atomist-skills/skill/commit/522afd6442ea7d5c6210505d9ad18fed28beed3d)
-   Add state backed by storage bucket. [1d2cd72](https://github.com/atomist-skills/skill/commit/1d2cd724480409de71ee85e2024b540d4fc4c443)
-   Allow for explicit abort of steps. [3a79edf](https://github.com/atomist-skills/skill/commit/3a79edfba893a804a8d57267c1b9d5dfb931bf1c)

### Changed

-   Move to skill.ts from index.ts for skill definition. [#15](https://github.com/atomist/skill/issues/15)
-   Make users and channels optional in Destinations. [d0eb283](https://github.com/atomist/skill/commit/d0eb283b368c371f5dcc8198333dd377ccad8537)
-   Swap author and committer when user details are provided to git.commit. [1b556eb](https://github.com/atomist-skills/skill/commit/1b556eb3c1d673210c4e7e3aa2cfa7c45009e3da)

### Fixed

-   Fix filtering of repos when different org/repos are configured. [d111c6a](https://github.com/atomist-skills/skill/commit/d111c6a4fb9147a3b648e87af3ae1d27f0340b6f)
