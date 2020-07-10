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

import { HandlerStatus } from "./handler";

class BuildableHandlerStatus implements HandlerStatus {
    constructor(public code: number, public reason?: string, public visibility?: undefined | "hidden") {}

    public hidden(): this {
        this.visibility = "hidden";
        return this;
    }
}

export function success(reason?: string): HandlerStatus & { hidden: () => HandlerStatus } {
    return new BuildableHandlerStatus(0, reason);
}

export function failure(reason?: string): HandlerStatus & { hidden: () => HandlerStatus } {
    return new BuildableHandlerStatus(1, reason);
}
