import { FlattenStep, Iterables, Tuple } from ".";
import { LinkedList } from "./list";
import { HashMap } from "./map";
import { HashSet } from "./set";

interface GroupByAccessor<K, V> {
    get(key: K): V | undefined;

    stream(): Pipeline<[K, V]>;

    [Symbol.iterator](): IterableIterator<[K, V]>;
}

export class Pipeline<T> {
    #source: Iterable<T>;
    #locked = false;

    constructor(iterable: Iterable<T>) {
        this.#source = iterable;
    }

    #lock(): this {
        if (this.#locked)
            throw new Error("Pipeline locked");
        this.#locked = true;
        return this;
    }

    public get locked(): boolean {
        return this.#locked;
    }

    public combine<S extends Tuple<any>, U>(combineFn: (...values: Tuple<[T, ...S]>) => U, ...others: Iterable<S[keyof S]>[]): Pipeline<U> {
        this.#lock();
        const iterable = Iterables.combine<Tuple<[T, ...S]>>(this.#source as any, ...others as any);

        return new Pipeline(
            (function* () {
                for (const values of iterable)
                    yield combineFn(...values);
            })()
        );
    }

    public join<S>(...others: Iterable<S>[]): Pipeline<T | S> {
        this.#lock();
        return new Pipeline(Iterables.join<T | S>(this.#source, ...others));
    }

    public take(count: number, offset: number = 0) {
        const self = this.#lock();
        return new Pipeline(
            (function* () {
                let i = 0;
                for (const val of self.#source) {
                    if (i >= count + offset) break;
                    if (i >= offset)
                        yield val;
                    i++;
                }
            })()
        );
    }

    public from(offset: number) {
        const self = this.#lock();
        return new Pipeline(
            (function* () {
                let i = 0;
                for (const val of self.#source) {
                    if (i >= offset)
                        yield val;
                    i++;
                }
            })()
        );
    }

    public limit(count: number) {
        const self = this.#lock();
        return new Pipeline(
            (function* () {
                let i = 0;
                for (const val of self.#source) {
                    if (i >= count) break;
                    yield val;
                    i++;
                }
            })()
        );
    }

    //Functionals

    public map<U>(callbackfn: (value: T, index: number) => U): Pipeline<U> {
        const self = this.#lock();
        return new Pipeline(
            (function* (): IterableIterator<U> {
                let i = 0;
                for (const value of self.#source)
                    yield callbackfn(value, i++);
            })()
        );
    }

    public filter<S extends T>(predicate: (value: T, index: number) => boolean | undefined | null): Pipeline<S>;
    public filter(predicate: (value: T, index: number) => boolean | undefined | null): Pipeline<T>;
    public filter(predicate: (value: any, index: number) => boolean | undefined | null): Pipeline<any> {
        const self = this.#lock();
        return new Pipeline(
            (function* () {
                let i = 0;
                for (const value of self.#source) {
                    if (predicate(value, i++)) {
                        yield value;
                    }
                }
            })()
        );
    }

    public flat<D extends number = 1>(depth: D = 1 as D): Pipeline<FlattenStep<T, D>> {
        const self = this.#lock();
        function* flatten(iter: Iterable<any>, currentDepth: number): Generator<FlattenStep<T, D>> {
            for (const item of iter) {
                if (currentDepth > 0 && item != null && typeof item[Symbol.iterator] === 'function') {
                    yield* flatten(item, currentDepth - 1);
                } else {
                    yield item as FlattenStep<T, D>;
                }
            }
        }
        return new Pipeline(flatten(self.#source, depth));
    }

    public flatMap<U>(callbackfn: (value: T, index: number) => U | Iterable<U>): Pipeline<U> {
        const self = this.#lock();
        return new Pipeline((function* () {
            let i = 0
            for (const value of self.#source) {
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

    public peek(callbackfn: (value: T, index: number) => void): Pipeline<T> {
        const self = this.#lock();
        return new Pipeline((function* () {
            let i = 0;
            for (const value of self.#source) {
                callbackfn(value, i++);
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

    public sort(compareFn?: (a: T, b: T) => number): Pipeline<T> {
        this.#lock();
        const cache = new LinkedList(this.#source);
        return new Pipeline(cache.sort(compareFn))
    }

    public reverse(): Pipeline<T> {
        this.#lock();
        const cache = new LinkedList(this.#source);
        return new Pipeline(cache.reverse())
    }

    public distinct(): Pipeline<T> {
        this.#lock();
        const cache = new HashSet(this.#source);
        return new Pipeline(cache);
    }

    public partition(count: number): Pipeline<T[]> {
        const self = this.#lock();
        return new Pipeline(
            (function* () {
                let cache = new Array<T>();
                for (const value of self.#source) {
                    cache.push(value)
                    if (cache.length >= count) {
                        yield cache;
                        cache = [];
                    }
                }
                if (cache.length > 0) yield cache;
            })()
        );
    }

    public groupby<K>(fn: (value: T, index: number) => K): GroupByAccessor<K, Pipeline<T>> {
        this.#lock();
        const cache = new HashMap<K, LinkedList<T>>();
        let i = 0;
        for (const value of this.#source) {
            const key = fn(value, i++);
            if (!cache.has(key))
                cache.set(key, new LinkedList());
            cache.get(key)?.push(value);
        }
        return cache.map(value => new Pipeline<T>(value));
    }

    public tee(n: number = 2): Pipeline<T>[] {
        this.#lock();
        const source = this.#source[Symbol.iterator]();
        const buffers: LinkedList<T>[] = Array.from({ length: n }, () => new LinkedList<T>());

        const createBranch = (myBuffer: LinkedList<T>) => {
            return new Pipeline((function* () {
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

        return buffers.map(createBranch);
    }


    public *sink(): IterableIterator<T> {
        this.#lock();
        yield* this.#source;
    }

    get [Symbol.toStringTag](): string { return "Pipeline"; }
}