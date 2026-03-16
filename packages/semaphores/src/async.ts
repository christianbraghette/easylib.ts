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

import type { ReleaseFunction, VarLock, Lock, Semaphore } from "./interfaces";

class QueueNode {
    constructor(public next?: QueueNode, public prev?: QueueNode) { }
}

class Queue<T> {
    #nodes = new WeakMap<QueueNode, T>();
    #values = new Map<T, QueueNode>();
    #head?: QueueNode;
    #tail?: QueueNode;
    #length = 0;

    get length(): number {
        return this.#length;
    }

    public push(...items: T[]): number {
        for (const item of items) {
            const newNode = new QueueNode();
            this.#nodes.set(newNode, item);

            if (!this.#head) {
                this.#head = newNode;
                this.#tail = newNode;
            } else {
                newNode.next = this.#head;
                this.#head.prev = newNode;
                this.#head = newNode;
            }

            this.#values.set(item, newNode);
            this.#length++;
        }
        return this.#length;
    }

    public shift(): T | undefined {
        if (!this.#tail) return undefined;

        const node = this.#tail;
        const value = this.#nodes.get(node)!;

        this.#tail = node.prev;
        if (this.#tail) this.#tail.next = undefined;
        else this.#head = undefined;

        node.prev = undefined;
        this.#nodes.delete(node);
        this.#values.delete(value);
        this.#length--;

        return value;
    }

    public remove(value: T): boolean {
        const node = this.#values.get(value);

        if (!node) return false;

        if (node.prev) node.prev.next = node.next;
        else this.#head = node.next;

        if (node.next) node.next.prev = node.prev;
        else this.#tail = node.prev;

        this.#nodes.delete(node);
        this.#values.delete(value);
        this.#length--;
        return true;
    }
}

export class AsyncSemaphore implements Semaphore {
    #count: number;
    #maxCount: number;
    readonly #queue = new Queue<{ resolve: (release: Lock) => void, reject: (reason: 'reset' | 'error') => void }>();

    public constructor(maxCount: number) {
        this.#count = maxCount;
        this.#maxCount = maxCount;
    }

    public get maxCount(): number {
        return this.#maxCount;
    }

    public set maxCount(count: number) {
        this.#count += count - this.maxCount;
        this.#maxCount = count;
    }

    public acquire(): Promise<Lock>
    public acquire(signal: AbortSignal): Promise<Lock>
    public acquire(callbackfn: (release: ReleaseFunction) => void): void
    public acquire(callbackfn?: ((release: ReleaseFunction) => void) | AbortSignal): Promise<Lock> | void {
        if (typeof callbackfn === 'function') {
            this.acquire().then((release) => {
                callbackfn(release.release);
                release.release();
            }).catch((error) => { throw error; });
            return;
        }
        if (this.#count-- > 0)
            return Promise.resolve(this.#createLock());
        return new Promise((resolve, reject) => {
            const entry = { resolve, reject };

            if (callbackfn instanceof AbortSignal) {
                if (callbackfn.aborted)
                    return reject(new Error("Acquire aborted"));

                let handler = () => {
                    this.#queue.remove(entry);
                    reject(new Error("Acquire aborted"));
                }

                callbackfn.addEventListener('abort', handler, { once: true })
            }

            this.#queue.push(entry);
        });
    }

    #createLock(released = false): Lock {
        class LockConstructor implements Lock {
            #released: boolean;

            constructor(semaphore: AsyncSemaphore)
            constructor(semaphore?: AsyncSemaphore, released?: boolean)
            constructor(semaphore?: AsyncSemaphore, released: boolean = false) {
                this.#released = released;
                this.release = semaphore ? () => {
                    if (this.#released) return;
                    this.#released = true;
                    if (semaphore.#count++ < 0)
                        semaphore.#queue.shift()?.resolve(semaphore.#createLock());
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
                return new LockConstructor(undefined, true);
            }

        }

        if (released)
            return new LockConstructor(undefined, released);
        return new LockConstructor(this);
    }

    public tryAcquire(): Lock | undefined {
        if (this.#count-- > 0)
            return this.#createLock();
        this.#count++;
        return;
    }

    public get locked(): boolean {
        return this.#count < 1;
    };

    public get waitersCount(): number {
        return this.#queue.length;
    }

    public releaseAll(): void {
        while (this.#queue.length > 0)
            this.#queue.shift()?.resolve(this.#createLock(true));
        this.#count = this.#maxCount;
    }

    public reset(): void {
        while (this.#queue.length > 0)
            this.#queue.shift()?.reject('reset');
        this.#count = this.#maxCount;
    }

    public async run<T>(fn: () => Promise<T> | T, ms?: number): Promise<T> {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), ms);

        try {
            const lock = await this.acquire(controller.signal);
            try {
                return await fn();
            } finally {
                lock.release();
            }
        } catch (err) {
            if (err instanceof Error && err.message === "Acquire aborted") {
                throw new Error("Mutex timeout");
            }
            throw err; // qualsiasi altro errore viene propagato
        } finally {
            clearTimeout(timer);
        }
    }
}

export class AsyncMutex extends AsyncSemaphore {
    public constructor() {
        super(1);
    }

    public accessor maxCount = 1;
}

export type * from "./interfaces";