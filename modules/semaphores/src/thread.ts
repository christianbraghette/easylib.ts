/**
 * Easylib.ts
 * 
 * Copyright 2026 Christian Braghette
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

import type { ReleaseFunction, Lock, Semaphore, Mutex } from "./interfaces";
import { AtomicInt32 } from "@easylib.ts/atomics";

if (!Symbol.dispose)
    (Symbol as any).dispose = Symbol("Symbol.dispose");

if (!Symbol.asyncDispose)
    (Symbol as any).asyncDispose = Symbol("Symbol.asyncDispose");

export class ThreadSemaphore implements Semaphore {
    readonly #count: AtomicInt32;
    #maxCount: number;

    public constructor(count: AtomicInt32, maxCount: number, initialized = false) {
        this.#count = count;
        this.#maxCount = maxCount;
        if (count.MAX < maxCount + 2)
            throw new Error("maxCount out of bound");
        if (!initialized)
            this.#count.set(maxCount);
    }

    public get maxCount(): number {
        return this.#maxCount;
    }

    public set maxCount(count: number) {
        this.#count.add(count - this.maxCount);
        this.#count.notify(count - this.maxCount);
        this.#maxCount = count;
    }

    public acquire(timeoutMs?: number): Promise<Lock>
    public acquire(signal: AbortSignal): Promise<Lock>
    public acquire(callbackfn?: AbortSignal | number): Promise<Lock> | void {
        return new Promise((resolve, reject) => {
            if (callbackfn instanceof AbortSignal) {
                if (callbackfn.aborted)
                    return reject(new Error("Acquire aborted"));

                callbackfn.addEventListener('abort', () => reject(new Error("Acquire aborted")), { once: true })
            }

            if (!this.#count.waitAsync?.(this.#count.sub()).then(res => {
                if (res !== 'ok')
                    return reject(res);
                return resolve(new ThreadSemaphore.Lock(this));
            })) {
                let lock: Lock | undefined;
                while (!lock) lock = this.tryAcquire();
                resolve(lock);
            }
        });
    }

    public tryAcquire(): Lock | undefined {
        if (this.#count.sub() > 0)
            return new ThreadSemaphore.Lock(this);
        this.#count.add();
        return;
    }

    public get locked(): boolean {
        return this.#count.get() < 1;
    };

    public get waiters(): number {
        return this.#maxCount - this.#count.get();
    }

    public releaseAll(): void {
        this.#count.set(this.#maxCount + 1);
    }

    public reset(): void {
        this.#count.set(this.#maxCount + 2);
    }

    public async run<T>(fn: (release: ReleaseFunction) => Promise<T> | T, ms?: number): Promise<T> {
        const lock = await this.acquire(ms);
        try {
            return await fn(lock.release);
        } finally {
            lock.release();
        }
    }

    private static Lock = class implements Lock {
        #released: boolean;

        constructor(semaphore: ThreadSemaphore)
        constructor(semaphore?: ThreadSemaphore, released?: boolean)
        constructor(semaphore?: ThreadSemaphore, released: boolean = false) {
            this.#released = released;
            this.release = semaphore ? () => {
                if (this.#released) return;
                this.#released = true;
                semaphore.#count.add();
                semaphore.#count.notify(1);
            } : () => {
                if (this.#released) return;
                this.#released = true;
            }
        }

        declare public readonly release: ReleaseFunction;

        public get locked() {
            return !this.#released;
        }

        [Symbol.dispose]() {
            this.release();
        }

        async [Symbol.asyncDispose]() {
            this.release();
        }

        public static released(): Lock {
            return new ThreadSemaphore.Lock(undefined, true);
        }

    }
}

export class ThreadMutex extends ThreadSemaphore implements Mutex {
    public constructor(count: AtomicInt32, initialized = false) {
        super(count, 1, initialized);
    }

    public accessor maxCount: 1 = 1;
}

export type * from "./interfaces";