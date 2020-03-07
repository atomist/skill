#! /usr/bin/env node
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

// tslint:disable-next-line:no-import-side-effect
import "source-map-support/register";

import * as yargs from "yargs";

// tslint:disable-next-line:no-unused-expression
yargs
    .command(
        "run",
        "Start container skill",
        args => args.options({
            skill: { type: "string", description: "Name of skill to load", demandOption: false},
        }),
        async argv => {
            return (await import("../lib/run")).run(argv.skill);
        },
    )
    .help()
    .argv;
