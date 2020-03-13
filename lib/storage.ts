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

export interface StorageProvider {

    store(key: string, sourceFilePath: string): Promise<void>;

    retrieve(key: string, targetFilePath: string): Promise<void>;
}

export function createStorageProvider(): StorageProvider {
    return new GoogleCloudStorageProvider();
}

class GoogleCloudStorageProvider implements StorageProvider {

    public async retrieve(key: string, filePath: string): Promise<void> {
        const storage = new (await import("@google-cloud/storage")).Storage();
        await storage.bucket(bucketName()).file(key).download({ destination: filePath });
    }

    public async store(key: string, filePath: string): Promise<void> {
        const storage = new (await import("@google-cloud/storage")).Storage();
        await storage.bucket(bucketName()).upload(filePath, {
            destination: key,
            resumable: false,
        });
    }
}

function bucketName(): string {
    const bucket = process.env.ATOMIST_STORAGE || process.env.STORAGE;
    return bucket.replace(/gs:\/\//, "");
}
