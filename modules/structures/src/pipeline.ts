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

import { FlattenStep, Tuple } from ".";
import { AsyncIterables, Iterables } from "./iterables";
import { LinkedList } from "./list";
import { HashMap } from "./map";
import { HashSet } from "./set";
import { AsyncMutex } from "@easylib.ts/semaphores";
import { EventEmitter } from "@easylib.ts/eventemitter"
import { LinkedQueue } from "./queue";

type TeePipe<T, D extends number, Acc extends T[] = []> =
    D extends 0 ? never : D extends 1 ? never :
    Acc['length'] extends D
    ? Acc
    : TeePipe<T, D, [...Acc, T]>;

export interface GroupByAccessor<K, V> {
    get(key: K): V | undefined;

    map<U>(callbackfn: (value: V, key: K, obj: GroupByAccessor<K, V>) => U): GroupByAccessor<K, U>;

    pipe(): Pipeline<[K, V], 'sync'>;

    [Symbol.iterator](): IterableIterator<[K, V]>;
}

interface BasePipeline<T, A extends 'sync' | 'async'> {
    readonly locked: boolean;

    take(count: number, offset?: number): Pipeline<T, A>
    offset(offset: number): Pipeline<T, A>
    limit(count: number): Pipeline<T, A>

    map<U>(callbackfn: (value: T, index: number) => U): Pipeline<U, A>
    filter<S extends T>(predicate: (value: T, index: number) => boolean | undefined | null): Pipeline<S, A>;
    filter(predicate: (value: T, index: number) => boolean | undefined | null): Pipeline<T, A>;
    flat<D extends number = 1>(depth?: D): Pipeline<FlattenStep<T, D>, A>
    flatMap<U>(callbackfn: (value: T, index: number) => U | Iterable<U>): Pipeline<U, A>
    peek(callbackfn: (value: T, index: number) => void, returnFn?: () => void): Pipeline<T, A>
    takeWhile(predicate: (value: T, index: number) => boolean): Pipeline<T, A>
    dropWhile(predicate: (value: T, index: number) => boolean): Pipeline<T, A>

    sort(compareFn?: (a: T, b: T) => number): Pipeline<T, A>
    reverse(): Pipeline<T, A>
    distinct(): Pipeline<T, A>
    buffer(size: number): Pipeline<T[], A>
    tap(): Observable<T>
    stream(): ReadableStream<T>
}

interface SyncPipeline<T> extends Iterable<T> {
    combine<S extends Tuple<any>, U>(combineFn: (value: T, ...values: S) => U, ...others: Iterable<S[keyof S]>[]): Pipeline<U, 'sync'>
    join<S>(...others: Iterable<S>[]): Pipeline<T | S, 'sync'>
    forEach(callbackfn: (value: T, index: number) => void): void
    reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentKey: number) => U, initialValue: U): U
    every(predicate: (value: T, index: number) => boolean | undefined | null): boolean
    find<S extends T>(predicate: (value: T, index: number) => boolean | undefined | null): S | undefined
    some(predicate: (value: T, index: number) => boolean | undefined | null): boolean
    collect<C>(collector: (iterable: Iterable<T>) => C): C
    count(): number
    min(compareFn?: (a: T, b: T) => number): T | undefined
    max(compareFn?: (a: T, b: T) => number): T | undefined
    groupby<K>(fn: (value: T, index: number) => K): GroupByAccessor<K, Pipeline<T, 'sync'>>
    tee<D extends number = 2>(n?: D): TeePipe<Pipeline<T, 'sync'>, D>
    leak(predicate?: (value: T, index: number) => boolean | undefined | null): Pipeline<T, 'sync'>
    sink(): IterableIterator<T>
}

interface AsyncPipeline<T> extends AsyncIterable<T> {
    combine<S extends Tuple<any>, U>(combineFn: (value: T, ...values: S) => U, ...others: AsyncIterable<S[keyof S]>[]): Pipeline<U, 'async'>
    join<S>(...others: AsyncIterable<S>[]): Pipeline<T | S, 'async'>
    forEach(callbackfn: (value: T, index: number) => void): Promise<void>
    reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentKey: number) => U, initialValue: U): Promise<U>
    every(predicate: (value: T, index: number) => boolean | undefined | null): Promise<boolean>
    find<S extends T>(predicate: (value: T, index: number) => boolean | undefined | null): Promise<S | undefined>
    some(predicate: (value: T, index: number) => boolean | undefined | null): Promise<boolean>
    collect<C>(collector: (iterable: AsyncIterable<T>) => Promise<C>): Promise<C>
    count(): Promise<number>
    min(compareFn?: (a: T, b: T) => number): Promise<T | undefined>
    max(compareFn?: (a: T, b: T) => number): Promise<T | undefined>
    groupby<K>(fn: (value: T, index: number) => K): Promise<GroupByAccessor<K, Pipeline<T, 'async'>>>
    tee<D extends number = 2>(n?: D): TeePipe<Pipeline<T, 'async'>, D>
    leak(predicate?: (value: T, index: number) => boolean | undefined | null): Pipeline<T, 'async'>
    sink(): AsyncIterableIterator<T>
}

export type Pipeline<T, A extends 'sync' | 'async'> = BasePipeline<T, A> & (A extends 'sync' ? SyncPipeline<T> : AsyncPipeline<T>);
export namespace Pipeline {
    export function from<T>(iterable: Iterable<T>): Pipeline<T, 'sync'>
    export function from<T>(iterable: AsyncIterable<T>): Pipeline<T, 'async'>
    export function from<T>(iterable: ReadableStream<T>): Pipeline<T, 'async'>
    export function from<T, R extends 'sync' | 'async' = 'async'>(iterable: AsyncIterable<T> & Iterable<T>, hint?: R): Pipeline<T, R>
    export function from<T>(iterable: AsyncIterable<T> | Iterable<T>, hint?: 'sync' | 'async'): Pipeline<T, 'sync' | 'async'> {
        if (Symbol.asyncIterator in iterable && hint !== 'sync')
            return new AsyncPipelineConstructor(iterable);
        return new SyncPipelineConstructor(iterable as Iterable<T>);
    }

    export function iterator<T>(startValue: T, callbackfn: (previousValue: T) => T, terminationfn?: (previousValue: T) => unknown): Pipeline<T, 'sync'> {
        return new SyncPipelineConstructor((function* () {
            let currentValue = startValue;
            yield currentValue;
            while (!terminationfn?.(currentValue)) {
                currentValue = callbackfn(currentValue);
                yield currentValue;
            }
        })())
    }

    export function asyncIterator<T>(startValue: T, callbackfn: (previousValue: T) => T | Promise<T>, terminationfn?: (currentValue: T) => unknown | Promise<unknown>): Pipeline<T, 'async'> {
        return new AsyncPipelineConstructor<T>((async function* () {
            let currentValue = startValue;
            yield currentValue;
            while (!await terminationfn?.(currentValue)) {
                currentValue = await callbackfn(currentValue);
                yield currentValue;
            }
        })())
    }
}

class ObservableIterator<T> implements AsyncIterableIterator<T, undefined, never> {
    #queue = new LinkedQueue<[number, T]>();
    #done = false;
    #emitter: EventEmitter<{ push: [number, T], close: undefined }>;

    constructor(emitter: EventEmitter<{ push: [number, T], close: undefined }>) {
        emitter.on('push', this.#push);
        emitter.on('close', this.#close);
        this.#emitter = emitter;
    }

    readonly #push = (value: [number, T]) => {
        this.#queue.push(value);
    }

    readonly #close = () => {
        this.#done = true;
    }

    #clear() {
        this.#queue.clear();
        this.#emitter.off('push', this.#push);
        this.#emitter.off('close', this.#close);
        this.#done = true;
    }

    async next(): Promise<IteratorResult<T, undefined>> {
        if (this.#queue.length === 0 && !this.#done) {
            await Promise.race([
                this.#emitter.wait('push'),
                this.#emitter.wait('close')
            ]);
        }

        const done = this.#queue.length === 0 && this.#done;
        const value = this.#queue.shift();
        return { value, done } as IteratorResult<T, undefined>;
    }

    async return(): Promise<IteratorReturnResult<undefined>> {
        this.#clear()
        return {
            value: undefined,
            done: true
        };
    }

    async throw(e?: any): Promise<IteratorResult<T, undefined>> {
        this.#clear()
        throw e;
    }

    [Symbol.asyncIterator]() {
        return new ObservableIterator(this.#emitter);
    }
}

class Observable<T> {
    #state: 'open' | 'close' = 'open';
    #map = new HashMap<Function, [(entry: [number, T]) => any, (() => void) | undefined]>;
    #emitter: EventEmitter<{ push: [number, T], close: undefined }>;

    constructor(emitter: EventEmitter<{ push: [number, T], close: undefined }>) {
        emitter.once('close', () => this.#state = 'close');
        this.#emitter = emitter;
    }

    get state() {
        return this.#state;
    }

    public register(callbackfn: (value: T, index: number) => void, returnFn?: () => void): void {
        const func = ([index, value]: [number, T]) => callbackfn(value, index);
        this.#emitter.on('push', func);
        this.#map.set(callbackfn, [func, returnFn]);
        if (returnFn)
            this.#emitter.once('close', returnFn);
    }

    public unregister(callbackfn: (value: T, index: number) => void): boolean {
        const func = this.#map.get(callbackfn);
        if (!func) return false;
        this.#emitter.off('push', func[0]);

        if (func[1])
            this.#emitter.off('close', func[1]);

        return this.#map.delete(callbackfn);
    }

    public pipe(): Pipeline<T, 'async'> {
        return new AsyncPipelineConstructor(this)
    }

    [Symbol.asyncIterator]() {
        return new ObservableIterator(this.#emitter);
    }
}

export class SyncPipelineConstructor<T> implements Pipeline<T, 'sync'> {
    #source: Iterable<T>;
    #locked = false;

    constructor(iterable: Iterable<T>) {
        this.#source = iterable;
    }

    #lock(): Iterable<T> {
        if (this.#locked)
            throw new Error("Pipeline locked");
        this.#locked = true;
        return this.#source;
    }

    public get locked(): boolean {
        return this.#locked;
    }

    public combine<S extends Tuple<any>, U>(combineFn: (value: T, ...values: S) => U, ...others: Iterable<S[keyof S]>[]): Pipeline<U, 'sync'> {
        this.#lock();
        const iterable = Iterables.combine<Tuple<[T, ...S]>>(this.#source as any, ...others as any);

        return new SyncPipelineConstructor(
            (function* () {
                for (const values of iterable)
                    yield combineFn(...values);
            })()
        );
    }

    public join<S>(...others: Iterable<S>[]): Pipeline<T | S, 'sync'> {
        this.#lock();
        return new SyncPipelineConstructor(Iterables.join<T | S>(this.#source, ...others));
    }

    public take(count: number, offset: number = 0): Pipeline<T, 'sync'> {
        const source = this.#lock();
        return new SyncPipelineConstructor(
            (function* () {
                let i = 0;
                for (const val of source) {
                    if (i >= count + offset) break;
                    if (i >= offset)
                        yield val;
                    i++;
                }
            })()
        );
    }

    public offset(offset: number): Pipeline<T, 'sync'> {
        const source = this.#lock();
        return new SyncPipelineConstructor(
            (function* () {
                let i = 0;
                for (const val of source) {
                    if (i >= offset)
                        yield val;
                    i++;
                }
            })()
        );
    }

    public limit(count: number): Pipeline<T, 'sync'> {
        const source = this.#lock();
        return new SyncPipelineConstructor(
            (function* () {
                let i = 0;
                for (const val of source) {
                    if (i >= count) break;
                    yield val;
                    i++;
                }
            })()
        );
    }

    //Functionals

    public map<U>(callbackfn: (value: T, index: number) => U): Pipeline<U, 'sync'> {
        const source = this.#lock();
        return new SyncPipelineConstructor(
            (function* (): IterableIterator<U> {
                let i = 0;
                for (const value of source)
                    yield callbackfn(value, i++);
            })()
        );
    }

    public filter<S extends T>(predicate: (value: T, index: number) => boolean | undefined | null): Pipeline<S, 'sync'>;
    public filter(predicate: (value: T, index: number) => boolean | undefined | null): Pipeline<T, 'sync'>;
    public filter(predicate: (value: any, index: number) => boolean | undefined | null): SyncPipelineConstructor<any> {
        const source = this.#lock();
        return new SyncPipelineConstructor(
            (function* () {
                let i = 0;
                for (const value of source) {
                    if (predicate(value, i++)) {
                        yield value;
                    }
                }
            })()
        );
    }

    public flat<D extends number = 1>(depth: D = 1 as D): Pipeline<FlattenStep<T, D>, 'sync'> {
        const source = this.#lock();
        function* flatten(iter: Iterable<any>, currentDepth: number): Generator<FlattenStep<T, D>> {
            for (const item of iter) {
                if (currentDepth > 0 && item != null && typeof item[Symbol.iterator] === 'function') {
                    yield* flatten(item, currentDepth - 1);
                } else {
                    yield item as FlattenStep<T, D>;
                }
            }
        }
        return new SyncPipelineConstructor(flatten(source, depth));
    }

    public flatMap<U>(callbackfn: (value: T, index: number) => U | Iterable<U>): Pipeline<U, 'sync'> {
        const source = this.#lock();
        return new SyncPipelineConstructor((function* () {
            let i = 0
            for (const value of source) {
                const mapped = callbackfn(value, i++);
                if (mapped != null && typeof (mapped as any)[Symbol.iterator] === 'function') {
                    yield* mapped as Iterable<U>;
                } else {
                    yield mapped as U;
                }
            }
        })()
        );
    }

    public peek(callbackfn: (value: T, index: number) => void, returnFn?: () => void): Pipeline<T, 'sync'> {
        const source = this.#lock();
        return new SyncPipelineConstructor((function* () {
            let i = 0;
            for (const value of source) {
                callbackfn(value, i++);
                yield value;
            }
            returnFn?.();
        })());
    }

    public takeWhile(predicate: (value: T, index: number) => boolean): Pipeline<T, 'sync'> {
        const source = this.#lock();
        return new SyncPipelineConstructor((function* () {
            let i = 0;
            for (const value of source) {
                if (!predicate(value, i++)) break;
                yield value;
            }
        })());
    }

    public dropWhile(predicate: (value: T, index: number) => boolean): Pipeline<T, 'sync'> {
        const source = this.#lock();
        return new SyncPipelineConstructor((function* () {
            let i = 0;
            let dropping = true;
            for (const value of source) {
                if (dropping && predicate(value, i++)) continue;
                dropping = false;
                yield value;
            }
        })());
    }

    //Collectors

    public forEach(callbackfn: (value: T, index: number) => void): void {
        this.#lock();
        let i = 0;
        for (const value of this.#source)
            callbackfn(value, i++);
    }

    public reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentKey: number) => U, initialValue: U): U {
        this.#lock();
        let i = 0;
        let accumulator = initialValue;
        for (const value of this.#source) {
            accumulator = callbackfn(accumulator, value, i++);
        }
        return accumulator;
    }

    public every(predicate: (value: T, index: number) => boolean | undefined | null): boolean {
        this.#lock();
        let i = 0;
        for (const value of this.#source) {
            if (!predicate(value, i++)) {
                return false;
            }
        }
        return true;
    }

    public find<S extends T>(predicate: (value: T, index: number) => boolean | undefined | null): S | undefined {
        this.#lock();
        let i = 0;
        for (const value of this.#source) {
            if (predicate(value, i++)) {
                return value as S;
            }
        }
        return undefined;
    }

    public some(predicate: (value: T, index: number) => boolean | undefined | null): boolean {
        this.#lock();
        let i = 0;
        for (const value of this.#source) {
            if (predicate(value, i++)) {
                return true;
            }
        }
        return false;
    }

    public collect<C>(collector: (iterable: Iterable<T>) => C): C {
        this.#lock();
        return collector(this.#source);
    }

    //Aggregators

    public sort(compareFn?: (a: T, b: T) => number): Pipeline<T, 'sync'> {
        this.#lock();
        const cache = new LinkedList(this.#source);
        return new SyncPipelineConstructor(cache.sort(compareFn))
    }

    public reverse(): Pipeline<T, 'sync'> {
        this.#lock();
        const cache = new LinkedList(this.#source);
        return new SyncPipelineConstructor(cache.reverse())
    }

    public distinct(): Pipeline<T, 'sync'> {
        this.#lock();
        const cache = new HashSet(this.#source);
        return new SyncPipelineConstructor(cache);
    }

    public count(): number {
        this.#lock();
        let count = 0;
        for (const _ of this.#source)
            count++;
        return count;
    }

    public min(compareFn: (a: T, b: T) => number = (a, b) => a == b ? 0 : a < b ? -1 : 1): T | undefined {
        this.#lock();
        let min: T | undefined = undefined;
        for (const value of this.#source) {
            min ??= value;
            if (compareFn(value, min) < 0) min = value;
        }
        return min;
    }

    public max(compareFn: (a: T, b: T) => number = (a, b) => a == b ? 0 : a < b ? -1 : 1): T | undefined {
        this.#lock();
        let max: T | undefined = undefined;
        for (const value of this.#source) {
            max ??= value;
            if (compareFn(max, value) < 0) max = value;
        }
        return max;
    }

    public buffer(size: number): Pipeline<T[], 'sync'> {
        const source = this.#lock();
        return new SyncPipelineConstructor(
            (function* () {
                let cache = new Array<T>(size);
                let i = 0;
                for (const value of source) {
                    cache[i++] = value;
                    if (i >= size) {
                        yield cache;
                        cache = new Array<T>(size);
                        i = 0;
                    }
                }
                if (cache.length > 0) yield cache;
            })()
        );
    }

    public groupby<K>(fn: (value: T, index: number) => K): GroupByAccessor<K, Pipeline<T, 'sync'>> {
        this.#lock();
        const cache = new HashMap<K, LinkedList<T>>();
        let i = 0;
        for (const value of this.#source) {
            const key = fn(value, i++);
            if (!cache.has(key))
                cache.set(key, new LinkedList());
            cache.get(key)?.push(value);
        }
        return cache.map<Pipeline<T, 'sync'>>(value => new SyncPipelineConstructor<T>(value));
    }

    public tee<D extends number = 2>(n: D = 2 as D): TeePipe<Pipeline<T, 'sync'>, D> {
        this.#lock();
        const buffers = Array.from({ length: n }, () => new LinkedList<T>());
        return buffers.map(this.#createBranch()) as TeePipe<Pipeline<T, 'sync'>, D>;
    }

    #createBranch(): (myBuffer: LinkedList<T>, index: number, buffers: LinkedList<T>[]) => SyncPipelineConstructor<T> {
        const source = this.#source[Symbol.iterator]();
        return (myBuffer, _, buffers) => {
            return new SyncPipelineConstructor((function* () {
                while (true) {
                    if (myBuffer.length > 0) {
                        yield myBuffer.shift()!;
                    } else {
                        const { value, done } = source.next();
                        if (done) break;

                        for (const b of buffers) {
                            if (b !== myBuffer) {
                                b.push(value);
                            }
                        }
                        yield value;
                    }
                }
            })());
        };
    }

    public leak(predicate?: (value: T, index: number) => boolean | undefined | null): Pipeline<T, 'sync'> {
        const [source, leak] = Array.from({ length: 2 }, () => new LinkedList<T>()).map(this.#createBranch());
        this.#source = source;
        const pipe = new SyncPipelineConstructor(leak);
        return predicate ? pipe.filter(predicate) : pipe;
    }

    public tap(): Observable<T> {
        const emitter = new EventEmitter<{ push: [number, T], close: undefined }>();

        const originalSource = this.#source;

        function* iterable() {
            let i = 0;
            for (const value of originalSource) {
                emitter.emit('push', [i++, value]);
                yield value;
            }
            emitter.emit('close', undefined);
        }

        this.#source = iterable();
        return new Observable(emitter);
    }

    public *sink(): IterableIterator<T> {
        this.#lock();
        yield* this.#source;
    }

    public stream(): ReadableStream<T> {
        const source = this.#lock();
        return new ReadableStream({
            start(controller) {
                for (const value of source)
                    controller.enqueue(value)
                controller.close();
            },
        })
    }

    [Symbol.iterator](): IterableIterator<T> {
        return this.sink();
    }

    get [Symbol.toStringTag](): string { return "Pipeline"; }

}

export class AsyncPipelineConstructor<T> implements Pipeline<T, 'async'> {
    #source: AsyncIterable<T>;
    #locked = false;

    constructor(iterable: AsyncIterable<T>) {
        this.#source = iterable;
    }

    #lock(): AsyncIterable<T> {
        if (this.#locked)
            throw new Error("Pipeline locked");
        this.#locked = true;
        return this;
    }

    public get locked(): boolean {
        return this.#locked;
    }

    public combine<S extends Tuple<any>, U>(combineFn: (value: T, ...values: S) => U, ...others: AsyncIterable<S[keyof S]>[]): Pipeline<U, 'async'> {
        this.#lock();

        const iterable = AsyncIterables.combine<Tuple<[T, ...S]>>(this.#source as any, ...others as any);

        return new AsyncPipelineConstructor<U>(
            (async function* () {
                for await (const values of iterable)
                    yield combineFn(...values);
            })()
        );
    }

    public join<S>(...others: AsyncIterable<S>[]): Pipeline<T | S, 'async'> {
        this.#lock();
        return new AsyncPipelineConstructor(AsyncIterables.join<T | S>(this.#source as AsyncIterable<T>, ...others));
    }

    public take(count: number, offset: number = 0): Pipeline<T, 'async'> {
        const source = this.#lock();
        return new AsyncPipelineConstructor<T>(
            (async function* () {
                let i = 0;
                for await (const val of source) {
                    if (i >= count + offset) break;
                    if (i >= offset)
                        yield val;
                    i++;
                }
            })()
        );
    }

    public offset(offset: number): Pipeline<T, 'async'> {
        const source = this.#lock();

        return new AsyncPipelineConstructor<T>(
            (async function* () {
                let i = 0;
                for await (const val of source) {
                    if (i >= offset)
                        yield val;
                    i++;
                }
            })()
        );
    }

    public limit(count: number): Pipeline<T, 'async'> {
        const source = this.#lock();

        return new AsyncPipelineConstructor<T>(
            (async function* () {
                let i = 0;
                for await (const val of source) {
                    if (i >= count) break;
                    yield val;
                    i++;
                }
            })()
        );
    }

    //Functionals

    public map<U>(callbackfn: (value: T, index: number) => U): Pipeline<U, 'async'> {
        const source = this.#lock();

        return new AsyncPipelineConstructor<U>(
            (async function* () {
                let i = 0;
                for await (const value of source)
                    yield callbackfn(value, i++);
            })()
        );
    }

    public filter<S extends T>(predicate: (value: T, index: number) => boolean | undefined | null): Pipeline<S, 'async'>;
    public filter(predicate: (value: T, index: number) => boolean | undefined | null): Pipeline<T, 'async'>;
    public filter(predicate: (value: any, index: number) => boolean | undefined | null): AsyncPipelineConstructor<any> {
        const source = this.#lock();

        return new AsyncPipelineConstructor(
            (async function* () {
                let i = 0;
                for await (const value of source) {
                    if (predicate(value, i++)) {
                        yield value;
                    }
                }
            })()
        );
    }

    public flat<D extends number = 1>(depth: D = 1 as D): Pipeline<FlattenStep<T, D>, 'async'> {
        const source = this.#lock();

        async function* flatten(iter: AsyncIterable<any>, currentDepth: number): AsyncGenerator<FlattenStep<T, D>> {
            for await (const item of iter) {
                if (currentDepth > 0 && item != null && typeof item[Symbol.iterator] === 'function') {
                    yield* flatten(item, currentDepth - 1);
                } else {
                    yield item as FlattenStep<T, D>;
                }
            }
        }
        return new AsyncPipelineConstructor(flatten(source as AsyncIterable<T>, depth));
    }

    public flatMap<U>(callbackfn: (value: T, index: number) => U | Iterable<U>): Pipeline<U, 'async'> {
        const source = this.#lock();

        return new AsyncPipelineConstructor<U>(
            (async function* () {
                let i = 0
                for await (const value of source) {
                    const mapped = callbackfn(value, i++);
                    if (mapped != null && typeof (mapped as any)[Symbol.iterator] === 'function') {
                        yield* mapped as Iterable<U>;
                    } else {
                        yield mapped as U;
                    }
                }
            })()
        );
    }

    public peek(callbackfn: (value: T, index: number) => void, returnFn?: () => void): Pipeline<T, 'async'> {
        const source = this.#lock();

        return new AsyncPipelineConstructor<T>(
            (async function* () {
                let i = 0;
                for await (const value of source) {
                    callbackfn(value, i++);
                    yield value;
                }
                returnFn?.()
            })()
        );
    }

    public takeWhile(predicate: (value: T, index: number) => boolean): Pipeline<T, 'async'> {
        const source = this.#lock();
        return new AsyncPipelineConstructor<T>((async function* () {
            let i = 0;
            for await (const value of source) {
                if (!predicate(value, i++)) break;
                yield value;
            }
        })());
    }

    public dropWhile(predicate: (value: T, index: number) => boolean): Pipeline<T, 'async'> {
        const source = this.#lock();
        return new AsyncPipelineConstructor<T>((async function* () {
            let i = 0;
            let dropping = true;
            for await (const value of source) {
                if (dropping && predicate(value, i++)) continue;
                dropping = false;
                yield value;
            }
        })());
    }

    //Collectors

    public async forEach(callbackfn: (value: T, index: number) => void): Promise<void> {
        this.#lock();
        let i = 0;
        for await (const value of this.#source)
            callbackfn(value, i++);
    }

    public async reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentKey: number) => U, initialValue: U): Promise<U> {
        this.#lock();
        let i = 0;
        let accumulator = initialValue;

        for await (const value of this.#source)
            accumulator = callbackfn(accumulator, value, i++);

        return accumulator
    }

    public async every(predicate: (value: T, index: number) => boolean | undefined | null): Promise<boolean> {
        this.#lock();
        let i = 0;

        for await (const value of this.#source) {
            if (!predicate(value, i++)) {
                return false;
            }
        }

        return true;
    }

    public async find<S extends T>(predicate: (value: T, index: number) => boolean | undefined | null): Promise<S | undefined> {
        this.#lock();
        let i = 0;

        for await (const value of this.#source) {
            if (predicate(value, i++)) {
                return value as S;
            }
        }

        return undefined;
    }

    public async some(predicate: (value: T, index: number) => boolean | undefined | null): Promise<boolean> {
        this.#lock();
        let i = 0;

        for await (const value of this.#source) {
            if (predicate(value, i++)) {
                return true;
            }
        }

        return false;
    }

    public collect<C>(collector: (iterable: AsyncIterable<T>) => Promise<C>): Promise<C> {
        this.#lock();
        return collector(this.#source);
    }

    //Aggregators

    public sort(compareFn?: (a: T, b: T) => number): Pipeline<T, 'async'> {
        const source = this.#lock();

        return new AsyncPipelineConstructor<T>((async function* () {
            const cache = new LinkedList<T>();

            for await (const value of source)
                cache.push(value);

            yield* cache.sort(compareFn);
        })())
    }

    public reverse(): Pipeline<T, 'async'> {
        const source = this.#lock();

        return new AsyncPipelineConstructor<T>((async function* () {
            const cache = new LinkedList<T>();

            for await (const value of source)
                cache.push(value);

            yield* cache.reverse();
        })())
    }

    public distinct(): Pipeline<T, 'async'> {
        const source = this.#lock();

        return new AsyncPipelineConstructor<T>((async function* () {
            const cache = new HashSet<T>();

            for await (const value of source)
                cache.add(value);

            yield* cache;
        })());
    }

    public buffer(size: number): Pipeline<T[], 'async'> {
        const source = this.#lock();
        return new AsyncPipelineConstructor(
            (async function* () {
                let cache = new Array<T>(size);
                let i = 0;
                for await (const value of source) {
                    cache[i++] = value;
                    if (i >= size) {
                        yield cache;
                        cache = new Array<T>(size);
                        i = 0;
                    }
                }
                if (cache.length > 0) yield cache;
            })()
        );
    }

    public async groupby<K>(fn: (value: T, index: number) => K): Promise<GroupByAccessor<K, AsyncPipelineConstructor<T>>> {
        this.#lock();
        const cache = new HashMap<K, LinkedList<T>>();
        let i = 0;

        for await (const value of this.#source) {
            const key = fn(value, i++);
            if (!cache.has(key))
                cache.set(key, new LinkedList());
            cache.get(key)?.push(value);
        }

        return cache.map(value => new AsyncPipelineConstructor<T>((async function* () { yield* value.values() })()));
    }

    public async count(): Promise<number> {
        this.#lock();
        let count = 0;
        for await (const _ of this.#source)
            count++;
        return count;
    }

    public async min(compareFn: (a: T, b: T) => number = (a, b) => a == b ? 0 : a < b ? -1 : 1): Promise<T | undefined> {
        this.#lock();
        let min: T | undefined = undefined;
        for await (const value of this.#source) {
            min ??= value;
            if (compareFn(value, min) < 0) min = value;
        }
        return min;
    }

    public async max(compareFn: (a: T, b: T) => number = (a, b) => a == b ? 0 : a < b ? -1 : 1): Promise<T | undefined> {
        this.#lock();
        let max: T | undefined = undefined;
        for await (const value of this.#source) {
            max ??= value;
            if (compareFn(max, value) < 0) max = value;
        }
        return max;
    }

    public tee<D extends number = 2>(n: D = 2 as D): TeePipe<Pipeline<T, 'async'>, D> {
        this.#lock();
        const state = { mutex: new AsyncMutex(), isDone: false };
        return Array.from({ length: n }, () => new LinkedList<T>()).map(this.#createBranch(state)) as TeePipe<Pipeline<T, 'async'>, D>;
    }

    #createBranch(state: { mutex: AsyncMutex; isDone: boolean; }): (myBuffer: LinkedList<T>, index: number, buffers: LinkedList<T>[]) => Pipeline<T, 'async'> {
        const source = (this.#source as AsyncIterable<T>)[Symbol.asyncIterator]();
        return (myBuffer, _, buffers) => {
            return new AsyncPipelineConstructor<T>((async function* () {
                while (true) {
                    let valueToYield: T | undefined;
                    let hasValue = false;

                    if (myBuffer.length > 0) {
                        yield myBuffer.shift()!;
                        continue;
                    }

                    if (state.isDone) break;

                    const lock = await state.mutex.acquire();
                    try {
                        if (myBuffer.length > 0) {
                            valueToYield = myBuffer.shift()!;
                            hasValue = true;
                        } else if (!state.isDone) {
                            const { value, done } = await source.next();
                            if (done) {
                                state.isDone = true;
                            } else {
                                for (const b of buffers) {
                                    if (b !== myBuffer) b.push(value);
                                }
                                valueToYield = value;
                                hasValue = true;
                            }
                        }
                    } finally {
                        lock.release();
                    }

                    if (hasValue) {
                        yield valueToYield!;
                    } else if (state.isDone) {
                        break;
                    }
                }
            })());
        }
    }

    public leak(predicate?: (value: T, index: number) => boolean | undefined | null): Pipeline<T, 'async'> {
        const state = { mutex: new AsyncMutex(), isDone: false };
        const [source, leak] = Array.from({ length: 2 }, () => new LinkedList<T>()).map(this.#createBranch(state));
        this.#source = source;
        const pipe = new AsyncPipelineConstructor(leak);
        return predicate ? pipe.filter(predicate) : pipe;
    }

    public tap(): Observable<T> {
        const emitter = new EventEmitter<{ push: [number, T], close: undefined }>();
        const originalSource = this.#source;

        async function* iterable() {
            let i = 0;
            for await (const value of originalSource) {
                emitter.emit('push', [i++, value]);
                yield value;
            }
            emitter.emit('close', undefined);
        }

        this.#source = iterable();
        return new Observable(emitter);
    }

    public async *sink(): AsyncIterableIterator<T> {
        this.#lock();
        yield* this.#source;
    }

    public stream(): ReadableStream<T> {
        const source = this.#lock();
        return new ReadableStream({
            async start(controller) {
                for await (const value of source)
                    controller.enqueue(value);
                controller.close();
            },
        })
    }

    [Symbol.asyncIterator](): AsyncIterableIterator<T> {
        return this.sink();
    }

    get [Symbol.toStringTag](): string { return "Pipeline"; }
}