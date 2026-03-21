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

import { FlattenStep } from ".";
import { LinkedList } from "./list";
import { HashMap } from "./map";
import { AsyncMutex } from "@easylib.ts/semaphores";
import { EventEmitter } from "@easylib.ts/eventemitter"
import { LinkedQueue } from "./queue";

type TeePipes<T, D extends number, Acc extends T[] = []> =
    D extends 0 ? never : D extends 1 ? never :
    Acc['length'] extends D
    ? Acc
    : TeePipes<T, D, [...Acc, T]>;

type ExpandType<T> = T extends (infer U)[] ? U : T;

interface GroupByAccessor<K, V> {
    get(key: K): V | undefined;

    map<U>(callbackfn: (value: V, key: K, obj: GroupByAccessor<K, V>) => U): GroupByAccessor<K, U>;

    pipe(): Pipe<[K, V]>;

    [Symbol.iterator](): IterableIterator<[K, V]>;
}

interface SideEffect<T> {
    leak(predicate?: (value: T, index: number) => unknown): Pipe<T>
    register(callbackfn: (value: T, index: number) => void, returnFn?: () => void): SideEffect<T>
    registerReturn(returnFn: () => void): SideEffect<T>
    unregister(callbackfn: (value: T, index: number) => void): boolean
    tap(): AsyncPipe<T>

    [Symbol.asyncIterator](): AsyncIterableIterator<T>
}

class SideIterator<T> implements AsyncIterableIterator<T, undefined, never> {
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
        return new SideIterator(this.#emitter);
    }
}

class Drain<T> {
    #value: T;

    constructor(value: T) {
        this.#value = value;
    }

    public valueOf() {
        return this.#value;
    }

    public apply(fn: (value: T) => void): Drain<T> {
        fn(this.#value)
        return this;
    }

    public map<S>(fn: ((value: T) => S)): Drain<S>
    public map<R extends any[], F extends { [K in keyof R]: (val: R[K]) => any }>(this: Drain<R>, fns: [...F]): Drain<{ [K in keyof F]: F[K] extends (val: any) => infer U ? U : never }>;
    public map<S>(fns: ((value: any) => S) | ((value: any) => S)[]): Drain<S> | Drain<S[]> {
        const val = this.#value;

        if (Array.isArray(fns)) {
            if (!Array.isArray(val)) {
                throw new TypeError("Invalid arguments");
            }
            const result = val.map((item, i) => {
                const transform = fns[i];
                return transform ? transform(item) : item;
            });
            return new Drain(result) as any;
        }

        return new Drain(fns(val));
    }

    public pipe(): Pipe<T> {
        return Pipe.of(this.#value);
    }

    [Symbol.iterator]() {
        return this.pipe().sink();
    }

}

export class Pipe<T> {
    #source: Iterable<T>;
    #locked = false;
    #side?: SideEffect<T>;

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

    public zip<S>(...others: Iterable<S>[]): Pipe<(T | S | undefined)[]> {
        this.#lock();
        const iterators = others.map(val => val[Symbol.iterator]()) as Iterator<S | T>[];
        iterators.unshift(this.#source[Symbol.iterator]());

        return new Pipe(
            (function* () {
                while (true) {
                    var res = iterators.map(val => val.next());
                    if (res.some(val => val.done)) break;
                    yield res.map(val => !val.done ? val.value : undefined);
                };
            })()
        );
    }

    public zipAll<S>(...others: Iterable<S>[]): Pipe<(T | S | undefined)[]> {
        this.#lock();
        const iterators = others.map(val => val[Symbol.iterator]()) as Iterator<S | T>[];
        iterators.unshift(this.#source[Symbol.iterator]());

        return new Pipe(
            (function* () {
                while (true) {
                    var res = iterators.map(val => val.next());
                    if (res.every(val => val.done)) break;
                    yield res.map(val => !val.done ? val.value : undefined);
                };
            })()
        );
    }

    public unzip<N extends number>(length: N): Drain<{ [K in keyof any[]]: Pipe<any> } & { length: N }> {
        this.#lock();

        const buffers = Array.from({ length }, () => new LinkedList<any>());
        const source = this.#source[Symbol.iterator]();

        const branches = buffers.map((myBuffer, index) => {
            return new Pipe((function* () {
                while (true) {
                    if (myBuffer.length > 0) {
                        yield myBuffer.shift()!;
                    } else {
                        const { value, done } = source.next();
                        if (done) break;

                        if (!Array.isArray(value) && !(Symbol.iterator in Object(value))) {
                            throw new TypeError("L'elemento della Pipe non è iterabile e non può essere decompresso (unzipped)");
                        }

                        const values = Array.from(value as Iterable<any>);
                        for (let i = 0; i < length; i++) {
                            if (i === index) continue;
                            if (buffers[i]) {
                                buffers[i].push(values[i]);
                            }
                        }
                        yield values[index];
                    }
                }
            })());
        });

        return new Drain(branches as any);
    }

    public concat<S>(...others: Iterable<S>[]): Pipe<T | S> {
        return new Pipe((function* (self: Iterable<T>) {
            yield* self;
            for (const iterable of others)
                yield* iterable;
        })(this.#lock()));
    }

    public take(count: number, offset: number = 0): Pipe<T> {
        const source = this.#lock();
        return new Pipe(
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

    public takeWhile(predicate: (value: T, index: number) => boolean): Pipe<T> {
        const source = this.#lock();
        return new Pipe((function* () {
            let i = 0;
            for (const value of source) {
                if (!predicate(value, i++)) break;
                yield value;
            }
        })());
    }

    public drop(offset: number): Pipe<T> {
        const source = this.#lock();
        return new Pipe(
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

    public dropWhile(predicate: (value: T, index: number) => boolean): Pipe<T> {
        const source = this.#lock();
        return new Pipe((function* () {
            let i = 0;
            let dropping = true;
            for (const value of source) {
                if (dropping && predicate(value, i++)) continue;
                dropping = false;
                yield value;
            }
        })());
    }

    public limit(count: number): Pipe<T> {
        const source = this.#lock();
        return new Pipe(
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

    public limitWhen(predicate: (value: T, index: number) => boolean): Pipe<T> {
        const source = this.#lock();
        return new Pipe(
            (function* () {
                let i = 0;
                for (const val of source) {
                    if (predicate(val, i++)) break;
                    yield val;
                }
            })()
        );
    }

    //Functionals

    public map<U>(callbackfn: (value: T, index: number) => U): Pipe<U> {
        const source = this.#lock();
        return new Pipe(
            (function* (): IterableIterator<U> {
                let i = 0;
                for (const value of source)
                    yield callbackfn(value, i++);
            })()
        );
    }

    public filter<S extends T>(predicate: (value: T, index: number) => unknown): Pipe<S> {
        const source = this.#lock();
        return new Pipe(
            (function* () {
                let i = 0;
                for (const value of source) {
                    if (predicate(value, i++)) {
                        yield value as S;
                    }
                }
            })()
        );
    }

    public flat<D extends number = 1>(depth: D = 1 as D): Pipe<FlattenStep<T, D>> {
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
        return new Pipe(flatten(source, depth));
    }

    public flatMap<U>(callbackfn: (value: T, index: number) => U | Iterable<U>): Pipe<U> {
        const source = this.#lock();
        return new Pipe((function* () {
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

    public peek(callbackfn: (value: T, index: number) => void, returnFn?: () => void): Pipe<T> {
        const source = this.#lock();
        return new Pipe((function* () {
            let i = 0;
            for (const value of source) {
                callbackfn(value, i++);
                yield value;
            }
            returnFn?.();
        })());
    }

    public apply(applier: (obj: SideEffect<T>) => void): this {
        if (!this.#side)
            this.#side = new Pipe.SideEffectConstructor(this);
        applier(this.#side);
        return this;
    }

    //Collectors

    public forEach(callbackfn: (value: T, index: number) => void): void {
        this.#lock();
        let i = 0;
        for (const value of this.#source)
            callbackfn(value, i++);
    }

    public reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentKey: number) => U, initialValue: U): Drain<U> {
        this.#lock();
        let i = 0;
        let accumulator = initialValue;
        for (const value of this.#source) {
            accumulator = callbackfn(accumulator, value, i++);
        }
        return new Drain(accumulator);
    }

    public expand(callbackfn: (prev: ExpandType<T>[], depth: number) => ExpandType<T>) {
        const source = this.#lock();
        return {
            for: (count: number): Pipe<ExpandType<T>[]> => {
                return new Pipe((function* () {
                    for (const value of source) {
                        const array = (Array.isArray(value) ? value : [value]) as ExpandType<T>[]
                        let i = 0;
                        while (i < count) {
                            array.push(callbackfn(array, i++));
                        }
                        yield array;
                    }
                })());
            },
            while: (predicate: (value: ExpandType<T>, index: number) => unknown): Pipe<ExpandType<T>[]> => {
                return new Pipe((function* () {
                    for (const value of source) {
                        const array = (Array.isArray(value) ? value : [value]) as ExpandType<T>[]
                        let i = 0;
                        let temp: ExpandType<T>;
                        while (true) {
                            temp = callbackfn(array, i++);
                            if (!predicate(temp, i)) break;
                            array.push(temp);
                        }
                        yield array;
                    }
                })());
            }
        }

    }

    public do(callbackfn: (value: T, index: number) => T) {
        const source = this.#lock();
        return {
            for: (count: number, step: number = 1) => {
                return new Pipe((function* () {
                    for (let value of source) {
                        let c = 0, i = 0;
                        while (c < count) {
                            if (c == i) {
                                value = callbackfn(value, i);
                                c += step;
                            }
                            i++
                        }
                        yield value;
                    }
                })());
            },
            while: (predicate: (value: T, index: number) => unknown) => {
                return new Pipe((function* () {
                    for (let value of source) {
                        let i = 0;
                        while (predicate(value, i))
                            value = callbackfn(value, i++);
                        yield value;
                    }
                })());
            }
        }
    }

    public find<S extends T>(predicate: (value: T, index: number) => unknown): Drain<S | undefined> {
        this.#lock();
        let i = 0;
        for (const value of this.#source) {
            if (predicate(value, i++)) {
                return new Drain<S | undefined>(value as S);
            }
        }
        return new Drain<S | undefined>(undefined);
    }

    public findLast<S extends T>(predicate: (value: T, index: number) => unknown): Drain<S | undefined> {
        this.#lock();
        let i = 0;
        let target: S | undefined = undefined;
        for (const value of this.#source)
            if (predicate(value, i++))
                target = value as S;
        return new Drain(target);
    }

    public some(predicate: (value: T, index: number) => unknown): Drain<boolean> {
        this.#lock();
        let i = 0;
        for (const value of this.#source) {
            if (predicate(value, i++)) {
                return new Drain(true);
            }
        }
        return new Drain(false);
    }

    public every(predicate: (value: T, index: number) => unknown): Drain<boolean> {
        this.#lock();
        let i = 0;
        for (const value of this.#source) {
            if (!predicate(value, i++)) {
                return new Drain(false);
            }
        }
        return new Drain(true);
    }

    public collect<C = T[]>(collector?: (iterable: Iterable<T>) => C): Drain<C> {
        this.#lock();
        collector ??= (iterable: Iterable<T>) => Array.from(iterable) as C
        return new Drain(collector(this.#source));
    }

    //Aggregators

    public sort(compareFn?: (a: T, b: T) => number): Pipe<T> {
        const source = this.#lock();
        return new Pipe((function* () {
            yield* new LinkedList(source).sort(compareFn);
        })())
    }

    public reverse(): Pipe<T> {
        const source = this.#lock();
        return new Pipe((function* () {
            yield* new LinkedList(source).reverse();
        })())
    }

    public distinct(): Pipe<T> {
        const source = this.#lock();
        return new Pipe((function* () {
            yield* new Set(source)
        })());
    }

    public count(): Drain<number> {
        this.#lock();
        let count = 0;
        for (const _ of this.#source)
            count++;
        return new Drain(count);
    }

    public min(compareFn: (a: T, b: T) => number = (a, b) => a == b ? 0 : a < b ? -1 : 1): Drain<T | undefined> {
        this.#lock();
        let min: T | undefined = undefined;
        for (const value of this.#source) {
            min ??= value;
            if (compareFn(value, min) < 0) min = value;
        }
        return new Drain(min);
    }

    public max(compareFn: (a: T, b: T) => number = (a, b) => a == b ? 0 : a < b ? -1 : 1): Drain<T | undefined> {
        this.#lock();
        let max: T | undefined = undefined;
        for (const value of this.#source) {
            max ??= value;
            if (compareFn(max, value) < 0) max = value;
        }
        return new Drain(max);
    }

    public buffer(size?: number): Pipe<T[]> {
        const source = this.#lock();
        if (!size) {
            return new Pipe([Array.from(source)])
        }
        return new Pipe(
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
                if (i > 0) yield cache.slice(0, i);
            })()
        );
    }

    public groupby<K>(fn: (value: T, index: number) => K): GroupByAccessor<K, Pipe<T>> {
        this.#lock();
        const cache = new HashMap<K, LinkedList<T>>();
        let i = 0;
        for (const value of this.#source) {
            const key = fn(value, i++);
            if (!cache.has(key))
                cache.set(key, new LinkedList());
            cache.get(key)?.push(value);
        }
        return cache.map<Pipe<T>>(value => new Pipe<T>(value));
    }

    public tee<D extends number = 2>(n: D = 2 as D): Drain<TeePipes<Pipe<T>, D>> {
        this.#lock();
        const buffers = Array.from({ length: n }, () => new LinkedList<T>());
        return new Drain(buffers.map(this.#createBranch()) as TeePipes<Pipe<T>, D>);
    }

    public join(pipe: Pipe<T>): AsyncPipe<T> {
        const source = this.#lock();
        return new AsyncPipe<T>((async function* () {
            await new Promise<void>((resolve) => pipe.apply((obj) => obj.registerReturn(resolve)));
            yield* source;
        })())
    }

    #createBranch(): (myBuffer: LinkedList<T>, index: number, buffers: LinkedList<T>[]) => Pipe<T> {
        const source = this.#source[Symbol.iterator]();
        return (myBuffer, _, buffers) => {
            return new Pipe((function* () {
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

    public *sink(): IterableIterator<T> {
        this.#lock();
        yield* this.#source;
    }

    public drain(): void {
        for (const _ of this.sink());
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

    async *[Symbol.asyncIterator](): AsyncIterableIterator<T> {
        yield* this.sink()
    }

    get [Symbol.toStringTag](): string { return "Pipeline"; }

    private static SideEffectConstructor = class <T> implements SideEffect<T> {
        #map = new HashMap<Function, [(entry: [number, T]) => any, (() => void) | undefined]>;
        #emitter = new EventEmitter<{ push: [number, T], close: undefined }>();
        #pipe: Pipe<T>;
        #registered = false;

        constructor(pipe: Pipe<T>) {
            this.#pipe = pipe
        }

        #registerEmitter() {
            if (this.#registered) return;
            this.#registered = true;
            const originalSource = this.#pipe.#source;
            const self = this;

            function* iterable() {
                let i = 0;
                try {
                    for (const value of originalSource) {
                        self.#emitter.emit('push', [i++, value]);
                        yield value;
                    }
                } finally {
                    self.#emitter.emit('close', undefined);
                }
            }

            this.#pipe.#source = iterable();
        }

        get locked() {
            return this.#pipe.#locked;
        }

        public leak(predicate?: (value: T, index: number) => unknown): Pipe<T> {
            const [source, leak] = Array.from({ length: 2 }, () => new LinkedList<T>()).map(this.#pipe.#createBranch());
            this.#pipe.#source = source;
            const pipe = new Pipe(leak);
            return predicate ? pipe.filter(predicate) : pipe;
        }

        public register(callbackfn: (value: T, index: number) => void, returnFn?: () => void): SideEffect<T> {
            this.#registerEmitter();
            const func = ([index, value]: [number, T]) => callbackfn(value, index);
            this.#emitter.on('push', func);
            this.#map.set(callbackfn, [func, returnFn]);
            if (returnFn)
                this.#emitter.once('close', returnFn);
            return this;
        }

        public registerReturn(returnFn: () => void): SideEffect<T> {
            this.#registerEmitter();
            this.#emitter.once('close', returnFn);
            return this;
        }

        public unregister(callbackfn: (value: T, index: number) => void): boolean {
            const func = this.#map.get(callbackfn);
            if (!func) return false;
            this.#emitter.off('push', func[0]);

            if (func[1])
                this.#emitter.off('close', func[1]);

            return this.#map.delete(callbackfn);
        }

        public tap(): AsyncPipe<T> {
            return new AsyncPipe(this)
        }

        [Symbol.asyncIterator](): AsyncIterableIterator<T> {
            return new SideIterator(this.#emitter);
        }
    }

    public static iterate<S>(startValue: S, callbackfn: (previousValue: S) => S, terminationfn?: (previousValue: S) => unknown): Pipe<S> {
        return new Pipe((function* () {
            let currentValue = startValue;
            yield currentValue;
            while (!terminationfn?.(currentValue)) {
                currentValue = callbackfn(currentValue);
                yield currentValue;
            }
        })())
    }

    public static of<S>(...items: S[]): Pipe<S> {
        return new Pipe(items);
    }

    public static from<T>(iterable: Iterable<T>): Pipe<T> {
        return new Pipe(iterable);
    }
}

export class AsyncPipe<T> {
    #source: AsyncIterable<T>;
    #locked = false;

    constructor(iterable: AsyncIterable<T>) {
        this.#source = iterable;
    }

    #lock(): AsyncIterable<T> {
        if (this.#locked)
            throw new Error("Pipeline locked");
        this.#locked = true;
        return this.#source;
    }

    public get locked(): boolean {
        return this.#locked;
    }

    public zip<S>(...others: AsyncIterable<S[keyof S]>[]): AsyncPipe<(T | S | undefined)[]> {
        this.#lock();
        const iterators = others.map(val => val[Symbol.asyncIterator]()) as AsyncIterator<S | T>[];
        iterators.unshift(this.#source[Symbol.asyncIterator]());

        return new AsyncPipe(
            (async function* () {
                while (true) {
                    var res = await Promise.all(iterators.map(val => val.next()));
                    if (res.every(val => val.done)) break;
                    yield res.map(val => !val.done ? val.value : undefined);
                };
            })()
        );
    }

    public concat<S>(...others: AsyncIterable<S>[]): AsyncPipe<T | S> {
        return new AsyncPipe<T | S>((async function* (self: AsyncIterable<T>) {
            yield* self;
            for await (const iterable of others)
                yield* iterable;
        })(this.#lock()));
    }

    public take(count: number, offset: number = 0): AsyncPipe<T> {
        const source = this.#lock();
        return new AsyncPipe<T>(
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

    public offset(offset: number): AsyncPipe<T> {
        const source = this.#lock();
        return new AsyncPipe<T>(
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

    public limit(count: number): AsyncPipe<T> {
        const source = this.#lock();

        return new AsyncPipe<T>(
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

    public map<U>(callbackfn: (value: T, index: number) => U) {
        const source = this.#lock();

        return new AsyncPipe<U>(
            (async function* () {
                let i = 0;
                for await (const value of source)
                    yield callbackfn(value, i++);
            })()
        );
    }

    public filter<S extends T>(predicate: (value: T, index: number) => unknown): AsyncPipe<S> {
        const source = this.#lock();

        return new AsyncPipe<S>(
            (async function* () {
                let i = 0;
                for await (const value of source) {
                    if (predicate(value, i++)) {
                        yield value as S;
                    }
                }
            })()
        );
    }

    public flat<D extends number = 1>(depth: D = 1 as D): AsyncPipe<FlattenStep<T, D>> {
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

        return new AsyncPipe(flatten(source as AsyncIterable<T>, depth));
    }

    public flatMap<U>(callbackfn: (value: T, index: number) => U | Iterable<U>): AsyncPipe<U> {
        const source = this.#lock();

        return new AsyncPipe<U>(
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

    public peek(callbackfn: (value: T, index: number) => void, returnFn?: () => void): AsyncPipe<T> {
        const source = this.#lock();

        return new AsyncPipe<T>(
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

    public takeWhile(predicate: (value: T, index: number) => boolean): AsyncPipe<T> {
        const source = this.#lock();
        return new AsyncPipe<T>((async function* () {
            let i = 0;
            for await (const value of source) {
                if (!predicate(value, i++)) break;
                yield value;
            }
        })());
    }

    public dropWhile(predicate: (value: T, index: number) => boolean): AsyncPipe<T> {
        const source = this.#lock();
        return new AsyncPipe<T>((async function* () {
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

    public async first(): Promise<T | undefined> {
        for await (const value of this.#lock())
            return value;
    }

    public async last(): Promise<T | undefined> {
        let last: T | undefined = undefined;
        for await (const value of this.#lock())
            last = value;
        return last;
    }

    public async every(predicate: (value: T, index: number) => unknown): Promise<boolean> {
        this.#lock();
        let i = 0;

        for await (const value of this.#source) {
            if (!predicate(value, i++)) {
                return false;
            }
        }

        return true;
    }

    public async find<S extends T>(predicate: (value: T, index: number) => unknown): Promise<S | undefined> {
        this.#lock();
        let i = 0;

        for await (const value of this.#source) {
            if (predicate(value, i++)) {
                return value as S;
            }
        }

        return undefined;
    }

    public async some(predicate: (value: T, index: number) => unknown): Promise<boolean> {
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

    public sort(compareFn?: (a: T, b: T) => number): AsyncPipe<T> {
        const source = this.#lock();
        return new AsyncPipe<T>((async function* () {
            const cache = new LinkedList<T>();

            for await (const value of source)
                cache.push(value);

            yield* cache.sort(compareFn);
        })())
    }

    public reverse(): AsyncPipe<T> {
        const source = this.#lock();
        return new AsyncPipe<T>((async function* () {
            const cache = new LinkedList<T>();

            for await (const value of source)
                cache.push(value);

            yield* cache.reverse();
        })())
    }

    public distinct(): AsyncPipe<T> {
        const source = this.#lock();
        return new AsyncPipe<T>((async function* () {
            const cache = new Set<T>();

            for await (const value of source)
                cache.add(value);

            yield* cache;
        })());
    }

    public buffer(size: number): AsyncPipe<T[]> {
        const source = this.#lock();
        return new AsyncPipe(
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
                if (i > 0) yield cache.slice(0, i);
            })()
        );
    }

    public async groupby<K>(fn: (value: T, index: number) => K): Promise<GroupByAccessor<K, AsyncPipe<T>>> {
        this.#lock();
        const cache = new HashMap<K, LinkedList<T>>();
        let i = 0;

        for await (const value of this.#source) {
            const key = fn(value, i++);
            if (!cache.has(key))
                cache.set(key, new LinkedList());
            cache.get(key)?.push(value);
        }

        return cache.map(value => new AsyncPipe<T>((async function* () { yield* value.values() })()));
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

    public tee<D extends number = 2>(n: D = 2 as D): TeePipes<AsyncPipe<T>, D> {
        this.#lock();
        const state = { mutex: new AsyncMutex(), isDone: false };
        return Array.from({ length: n }, () => new LinkedList<T>()).map(this.#createBranch(state)) as TeePipes<AsyncPipe<T>, D>;
    }

    /*public join(pipe: AsyncPipe<T> | Pipe<T>): AsyncPipe<T> {
        const source = this.#lock();
        return new AsyncPipe<T>((async function* () {
            await new Promise<void>(pipe.tap().registerReturn);
            yield* source;
        })())
    }*/

    #createBranch(state: { mutex: AsyncMutex; isDone: boolean; }): (myBuffer: LinkedList<T>, index: number, buffers: LinkedList<T>[]) => AsyncPipe<T> {
        const source = (this.#source as AsyncIterable<T>)[Symbol.asyncIterator]();
        return (myBuffer, _, buffers) => {
            return new AsyncPipe<T>((async function* () {
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

    public leak(predicate?: (value: T, index: number) => unknown): AsyncPipe<T> {
        const state = { mutex: new AsyncMutex(), isDone: false };
        const [source, leak] = Array.from({ length: 2 }, () => new LinkedList<T>()).map(this.#createBranch(state));
        this.#source = source;
        const pipe = new AsyncPipe(leak);
        return predicate ? pipe.filter(predicate) : pipe;
    }

    /*public tap(): Observable<T> {
        const emitter = new EventEmitter<{ push: [number, T], close: undefined }>();
        const originalSource = this.#source;

        async function* iterable() {
            let i = 0;
            try {
                for await (const value of originalSource) {
                    emitter.emit('push', [i++, value]);
                    yield value;
                }
            } finally {
                emitter.emit('close', undefined);
            }
        }

        this.#source = iterable();
        return new Observable(emitter);
    }*/

    public async *sink(): AsyncIterableIterator<T> {
        this.#lock();
        yield* this.#source;
    }

    public async drain(): Promise<void> {
        for await (const _ of this.sink());
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

    public static iterate<S>(startValue: S, callbackfn: (previousValue: S) => S | Promise<S>, terminationfn?: (currentValue: S) => unknown | Promise<unknown>): AsyncPipe<S> {
        return new AsyncPipe<S>((async function* () {
            let currentValue = startValue;
            yield currentValue;
            while (!await terminationfn?.(currentValue)) {
                currentValue = await callbackfn(currentValue);
                yield currentValue;
            }
        })())
    }

    public static of<S>(...items: S[]): AsyncPipe<S> {
        return new AsyncPipe<S>((async function* () {
            yield* items;
        })());
    }

    public static from<T>(iterable: AsyncIterable<T>): AsyncPipe<T> {
        return new AsyncPipe(iterable);
    }
}