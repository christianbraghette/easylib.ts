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

if (!Symbol.dispose)
    (Symbol as any).dispose = Symbol("Symbol.dispose");

if (!Symbol.asyncDispose)
    (Symbol as any).asyncDispose = Symbol("Symbol.asyncDispose");

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

    public get locked(): boolean {
        return this.#count < 1;
    };

    public get waiters(): number {
        return this.#queue.length;
    }

    public acquire(timeoutMs?: number): Promise<Lock>
    public acquire(signal: AbortSignal): Promise<Lock>
    public acquire(arg?: AbortSignal | number): Promise<Lock> | void {
        if (this.#count > 0) {
            this.#count--;
            return Promise.resolve<Lock>(new AsyncSemaphore.Lock(this));
        }
        return new Promise((resolve, reject) => {
            const entry = { resolve, reject };
            this.#count--;

            let timeoutId: any;
            let abortSignal: AbortSignal | undefined;

            if (arg instanceof AbortSignal) {
                abortSignal = arg;
            } else if (typeof arg === 'number') {
                const controller = new AbortController();
                timeoutId = setTimeout(() => controller.abort(), arg);
                abortSignal = controller.signal;
            }

            if (abortSignal) {
                if (abortSignal.aborted) {
                    this.#count++;
                    return reject(new Error(typeof arg === 'number' ? "Acquire timeout" : "Acquire aborted"));
                }

                const abortHandler = () => {
                    if (timeoutId) clearTimeout(timeoutId);
                    if (this.#queue.remove(entry)) {
                        this.#count++;
                    }
                    reject(new Error(typeof arg === 'number' ? "Acquire timeout" : "Acquire aborted"));
                };

                abortSignal.addEventListener('abort', abortHandler, { once: true });

                entry.resolve = (lock: Lock | PromiseLike<Lock>) => {
                    if (timeoutId) clearTimeout(timeoutId);
                    abortSignal?.removeEventListener('abort', abortHandler);
                    resolve(lock);
                };
            }

            this.#queue.push(entry);
        });
    }

    public tryAcquire(): Lock | undefined {
        if (this.#count > 0) {
            this.#count--;
            return new AsyncSemaphore.Lock(this);
        }
        return;
    }

    public releaseAll(): void {
        while (this.#queue.length > 0)
            this.#queue.shift()?.resolve(new AsyncSemaphore.Lock(undefined, true));
        this.#count = this.#maxCount;
    }

    public reset(): void {
        while (this.#queue.length > 0)
            this.#queue.shift()?.reject('reset');
        this.#count = this.#maxCount;
    }

    public async run<T>(callbackFn: (release: ReleaseFunction) => Promise<T> | T, ms?: number): Promise<T> {
        const lock = await this.acquire(ms);
        try {
            return await callbackFn(lock.release);
        } finally {
            lock.release();
        }
    }

    private static Lock = class implements Lock {
        #released: boolean;

        constructor(semaphore: AsyncSemaphore)
        constructor(semaphore?: AsyncSemaphore, released?: boolean)
        constructor(semaphore?: AsyncSemaphore, released: boolean = false) {
            this.#released = released;
            this.release = semaphore ? () => {
                if (this.#released) return;
                this.#released = true;
                if (semaphore.#count++ < 0)
                    semaphore.#queue.shift()?.resolve(new AsyncSemaphore.Lock(semaphore));
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

        public static release(): Lock {
            return new AsyncSemaphore.Lock(undefined, true);
        }

    }
}

export class AsyncMutex extends AsyncSemaphore implements Mutex {
    public constructor() {
        super(1);
    }

    public accessor maxCount: 1 = 1;
}

export type * from "./interfaces";