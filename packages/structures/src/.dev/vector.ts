import { AsyncIterables, FlattenStep, Iterables, Tuple } from "./index";
import { ArrayList } from "./list";

function isna(value: any) {
    return value === undefined || value === null || (typeof value === 'number' && isNaN(value));
}

export class Vector<T> {
    #getDataset: () => Iterable<T>;

    constructor(generator: () => Iterable<T>) {
        this.#getDataset = generator;
    }

    // Operations

    public combine<S extends Tuple<any>, U>(combineFn: (...values: Tuple<[T, ...S]>) => U, ...others: Iterable<S[keyof S]>[]): Vector<U> {
        const iterable = Iterables.combine<Tuple<[T, ...S]>>(this.#getDataset() as any, ...others as any);

        function* iterator(): IterableIterator<U> {
            for (const values of iterable)
                yield combineFn(...values);
        }

        return new Vector(() => iterator());
    }

    public mul(this: Vector<number>, value: number): Vector<number>
    public mul(this: Vector<number>, iterable: Iterable<number>): Vector<number>
    public mul(this: Vector<number>, arg: Iterable<number> | number): Vector<number> {
        if (typeof arg === 'number') {
            return this.map((val) => val * arg);
        }
        return this.combine<[number], number>((left, right) => left * right, arg);
    }

    public div(this: Vector<number>, value: number): Vector<number>
    public div(this: Vector<number>, iterable: Iterable<number>): Vector<number>
    public div(this: Vector<number>, arg: Iterable<number> | number): Vector<number> {
        if (typeof arg === 'number') {
            return this.map((val) => val / arg);
        }
        return this.combine<[number], number>((left, right) => left / right, arg);
    }

    public add(this: Vector<number>, value: number): Vector<number>
    public add(this: Vector<number>, iterable: Iterable<number>): Vector<number>
    public add(this: Vector<number>, arg: Iterable<number> | number): Vector<number> {
        if (typeof arg === 'number') {
            return this.map((val) => val + arg);
        }
        return this.combine<[number], number>((left, right) => left + right, arg);
    }

    public sub(this: Vector<number>, value: number): Vector<number>
    public sub(this: Vector<number>, iterable: Iterable<number>): Vector<number>
    public sub(this: Vector<number>, arg: Iterable<number> | number): Vector<number> {
        if (typeof arg === 'number') {
            return this.map((val) => val - arg);
        }
        return this.combine<[number], number>((left, right) => left - right, arg);
    }

    public and<S>(value: Iterable<S>): Vector<boolean | null> {
        return this.combine<[S], boolean | null>((left, right) => isna(left) || isna(right) ? null : Boolean(left) && Boolean(right), value);
    }

    public or<S>(value: Iterable<S>): Vector<boolean | null> {
        return this.combine<[S], boolean | null>((left, right) => isna(left) || isna(right) ? null : Boolean(left) || Boolean(right), value);
    }

    public not(): Vector<boolean | null> {
        const self = this;

        function* iterator(): IterableIterator<boolean | null> {
            for (const value of self.#getDataset())
                yield isna(value) ? null : !Boolean(value)
        }

        return new Vector(() => iterator());
    }

    public isna(): Vector<boolean> {
        return this.map((value) => isna(value));
    }

    public fillna(value: T): Vector<T> {
        return this.map(item => isna(item) ? value : item);
    }

    public take(count: number, offset: number = 0) {
        return new Vector(() => {
            const self = this;
            return (function* () {
                let i = 0;
                for (const val of self.#getDataset()) {
                    if (i >= count + offset) break;
                    if (i >= offset)
                        yield val;
                    i++;
                }
            })();
        });
    }

    public from(offset: number) {
        return new Vector(() => {
            const self = this;
            return (function* () {
                let i = 0;
                for (const val of self.#getDataset()) {
                    if (i >= offset)
                        yield val;
                    i++;
                }
            })();
        });
    }

    public limit(count: number) {
        return new Vector(() => {
            const self = this;
            return (function* () {
                let i = 0;
                for (const val of self.#getDataset()) {
                    if (i >= count) break;
                    yield val;
                    i++;
                }
            })();
        });
    }

    //Functionals

    public map<U>(callbackfn: (value: T, index: number, obj: Vector<T>) => U): Vector<U> {
        return new Vector(() => {
            const self = this;
            return (function* (): IterableIterator<U> {
                for (const [index, value] of self.entries())
                    yield callbackfn(value, index, self);
            })()
        });
    }

    public filter<S extends T>(predicate: (value: T, key: number, obj: Vector<T>) => boolean | undefined | null): Vector<S>;
    public filter(predicate: (value: T, key: number, obj: Vector<T>) => boolean | undefined | null): Vector<T>;
    public filter(predicate: (value: any, key: number, obj: Vector<T>) => boolean | undefined | null): Vector<any> {
        return new Vector(() => {
            const self = this;
            return (function* () {
                for (const [key, value] of self.entries()) {
                    if (predicate(value, key, self)) {
                        yield value;
                    }
                }
            })();
        });
    }

    public flat<D extends number = 1>(depth: D = 1 as D): Vector<FlattenStep<T, D>> {
        const self = this;
        return new Vector(() => {
            function* flatten(iter: Iterable<any>, currentDepth: number): Generator<FlattenStep<T, D>> {
                for (const item of iter) {
                    if (currentDepth > 0 && item != null && typeof item[Symbol.iterator] === 'function') {
                        yield* flatten(item, currentDepth - 1);
                    } else {
                        yield item as FlattenStep<T, D>;
                    }
                }
            }
            return flatten(self.values(), depth);
        });
    }

    public flatMap<U>(callbackfn: (value: T, key: number, obj: Vector<T>) => U | Iterable<U>): Vector<U> {
        const self = this;
        return new Vector(() => {
            return (function* () {
                for (const [key, value] of self.entries()) {
                    const mapped = callbackfn(value, key, self);
                    if (mapped != null && typeof (mapped as any)[Symbol.iterator] === 'function') {
                        yield* mapped as Iterable<U>;
                    } else {
                        yield mapped as U;
                    }
                }
            })();
        });
    }

    //Collectors

    public forEach(callbackfn: (value: T, key: number, obj: Vector<T>) => void): void {
        for (const [key, value] of this.entries())
            callbackfn(value, key, this);
    }

    public reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentKey: number, obj: Vector<T>) => U, initialValue: U): U {
        let accumulator = initialValue;
        for (const [key, value] of this.entries()) {
            accumulator = callbackfn(accumulator, value, key, this);
        }
        return accumulator;
    }

    public every(predicate: (value: T, key: number, obj: Vector<T>) => boolean | undefined | null): boolean {
        for (const [key, value] of this.entries()) {
            if (!predicate(value, key, this)) {
                return false;
            }
        }
        return true;
    }

    public find<S extends T>(predicate: (value: T, key: number, obj: Vector<T>) => boolean | undefined | null): S | undefined {
        for (const [key, value] of this.entries()) {
            if (predicate(value, key, this)) {
                return value as S;
            }
        }
        return undefined;
    }

    public some(predicate: (value: T, key: number, obj: Vector<T>) => boolean | undefined | null): boolean {
        for (const [key, value] of this.entries()) {
            if (predicate(value, key, this)) {
                return true;
            }
        }
        return false;
    }

    public collect<C>(collector: (iterable: Iterable<T>) => C): C {
        return collector(this);
    }

    // Aggregators

    public count(): number {
        let i = 0;
        for (const _ of this.#getDataset()) i++
        return i;
    }

    public sum(this: Vector<number>): number {
        let sum = 0;
        for (const value of this.#getDataset()) sum += value;
        return sum;
    }

    public min(this: Vector<number>): number {
        let min: number = Number.POSITIVE_INFINITY;
        for (const value of this.#getDataset())
            if (value < min) min = value;
        return min;
    }

    public max(this: Vector<number>): number {
        let max: number = Number.NEGATIVE_INFINITY;
        for (const value of this.#getDataset())
            if (value > max) max = value;
        return max;
    }

    public mean(this: Vector<number>): number {
        let count = 0;
        let sum = 0;
        for (const value of this.#getDataset()) {
            sum += value;
            count++;
        }
        return sum / count;
    }

    public median(this: Vector<number>): number {
        const values = Array.from(this.filter(n => !isna(n))).sort((a, b) => a - b);

        const len = values.length;
        if (len === 0) return NaN;

        const mid = Math.floor(len / 2);
        return len % 2 !== 0
            ? values[mid]
            : (values[mid - 1] + values[mid]) / 2;
    }

    // Iterators

    public *keys(): IterableIterator<number> {
        let i = 0;
        for (const _ of this.#getDataset())
            yield i++;
    }

    public *values(): IterableIterator<T> {
        yield* this.#getDataset();
    }

    public *entries(): IterableIterator<[number, T]> {
        let i = 0;
        for (const value of this.#getDataset())
            yield [i++, value];
    }

    [Symbol.iterator](): IterableIterator<T> {
        return this.values();
    }

    [Symbol.toStringTag] = "Vector";

    public static from<U>(iterable: Iterable<U>): Vector<U> {
        return new Vector(function* () {
            for (const item of iterable) {
                yield item;
            }
        });
    }

    public static of<U>(...items: U[]): Vector<U> {
        return Vector.from(items);
    }
}

export class AsyncVector<T> {
    #getDataset: () => AsyncIterable<T>;

    constructor(generator: () => AsyncIterable<T>) {
        this.#getDataset = generator;
    }

    // Operations

    public combine<S extends Tuple<any>, U>(combineFn: (...values: Tuple<[T, ...S]>) => U, ...others: AsyncIterable<S[keyof S]>[]): AsyncVector<U> {
        const iterable = AsyncIterables.combine<Tuple<[T, ...S]>>(this.#getDataset() as any, ...others as any);

        async function* iterator(): AsyncIterableIterator<U> {
            for await (const values of iterable)
                yield combineFn(...values);
        }

        return new AsyncVector(() => iterator());
    }

    public mul(this: AsyncVector<number>, value: number): AsyncVector<number>
    public mul(this: AsyncVector<number>, iterable: AsyncIterable<number>): AsyncVector<number>
    public mul(this: AsyncVector<number>, arg: AsyncIterable<number> | number): AsyncVector<number> {
        if (typeof arg === 'number') {
            return this.map((val) => val * arg);
        }
        return this.combine<[number], number>((left, right) => left * right, arg);
    }

    public div(this: AsyncVector<number>, value: number): AsyncVector<number>
    public div(this: AsyncVector<number>, iterable: AsyncIterable<number>): AsyncVector<number>
    public div(this: AsyncVector<number>, arg: AsyncIterable<number> | number): AsyncVector<number> {
        if (typeof arg === 'number') {
            return this.map((val) => val / arg);
        }
        return this.combine<[number], number>((left, right) => left / right, arg);
    }

    public add(this: AsyncVector<number>, value: number): AsyncVector<number>
    public add(this: AsyncVector<number>, iterable: AsyncIterable<number>): AsyncVector<number>
    public add(this: AsyncVector<number>, arg: AsyncIterable<number> | number): AsyncVector<number> {
        if (typeof arg === 'number') {
            return this.map((val) => val + arg);
        }
        return this.combine<[number], number>((left, right) => left + right, arg);
    }

    public sub(this: AsyncVector<number>, value: number): AsyncVector<number>
    public sub(this: AsyncVector<number>, iterable: AsyncIterable<number>): AsyncVector<number>
    public sub(this: AsyncVector<number>, arg: AsyncIterable<number> | number): AsyncVector<number> {
        if (typeof arg === 'number') {
            return this.map((val) => val - arg);
        }
        return this.combine<[number], number>((left, right) => left - right, arg);
    }

    public and<S>(value: AsyncIterable<S>): AsyncVector<boolean | null> {
        return this.combine<[S], boolean | null>((left, right) => isna(left) || isna(right) ? null : Boolean(left) && Boolean(right), value);
    }

    public or<S>(value: AsyncIterable<S>): AsyncVector<boolean | null> {
        return this.combine<[S], boolean | null>((left, right) => isna(left) || isna(right) ? null : Boolean(left) || Boolean(right), value);
    }

    public not(): AsyncVector<boolean | null> {
        const self = this;

        async function* iterator(): AsyncIterableIterator<boolean | null> {
            for await (const value of self.#getDataset())
                yield isna(value) ? null : !Boolean(value)
        }

        return new AsyncVector(() => iterator());
    }

    public isna(): AsyncVector<boolean> {
        return this.map((value) => isna(value));
    }

    public fillna(value: T): AsyncVector<T> {
        return this.map(item => isna(item) ? value : item);
    }

    public take(count: number, offset: number = 0) {
        return new AsyncVector(() => {
            const self = this;
            return (async function* () {
                let i = 0;
                for await (const val of self.#getDataset()) {
                    if (i >= count + offset) break;
                    if (i >= offset)
                        yield val;
                    i++;
                }
            })();
        });
    }

    public from(offset: number) {
        return new AsyncVector(() => {
            const self = this;
            return (async function* () {
                let i = 0;
                for await (const val of self.#getDataset()) {
                    if (i >= offset)
                        yield val;
                    i++;
                }
            })();
        });
    }

    public limit(count: number) {
        return new AsyncVector(() => {
            const self = this;
            return (async function* () {
                let i = 0;
                for await (const val of self.#getDataset()) {
                    if (i >= count) break;
                    yield val;
                    i++;
                }
            })();
        });
    }


    //Functionals

    public map<U>(callbackfn: (value: T, index: number, obj: AsyncVector<T>) => U | Promise<U>): AsyncVector<U> {
        return new AsyncVector(() => {
            const self = this;
            return (async function* (): AsyncIterableIterator<U> {
                for await (const [index, value] of self.entries())
                    yield await callbackfn(value, index, self);
            })()
        });
    }

    public filter<S extends T>(predicate: (value: T, key: number, obj: AsyncVector<T>) => boolean | undefined | null | Promise<boolean | undefined | null>): AsyncVector<S>;
    public filter(predicate: (value: T, key: number, obj: AsyncVector<T>) => boolean | undefined | null | Promise<boolean | undefined | null>): AsyncVector<T>;
    public filter(predicate: (value: any, key: number, obj: AsyncVector<T>) => any): AsyncVector<any> {
        return new AsyncVector(() => {
            const self = this;
            return (async function* () {
                for await (const [key, value] of self.entries()) {
                    if (await predicate(value, key, self)) {
                        yield value;
                    }
                }
            })();
        });
    }

    public flat<D extends number = 1>(depth: D = 1 as D): AsyncVector<FlattenStep<T, D>> {
        const self = this;
        return new AsyncVector(() => {
            async function* flatten(iter: AsyncIterable<any> | Iterable<any>, currentDepth: number): AsyncIterableIterator<FlattenStep<T, D>> {
                for await (const item of iter) {
                    const isIterable = item != null && (typeof item[Symbol.iterator] === 'function' || typeof item[Symbol.asyncIterator] === 'function');
                    if (currentDepth > 0 && isIterable) {
                        yield* flatten(item, currentDepth - 1);
                    } else {
                        yield item as FlattenStep<T, D>;
                    }
                }
            }
            return flatten(self.#getDataset(), depth);
        });
    }

    public flatMap<U>(callbackfn: (value: T, key: number, obj: AsyncVector<T>) => U | Iterable<U> | AsyncIterable<U> | Promise<U | Iterable<U> | AsyncIterable<U>>): AsyncVector<U> {
        const self = this;
        return new AsyncVector(() => (async function* () {
            for await (const [key, value] of self.entries()) {
                const mapped = await callbackfn(value, key, self);
                if (mapped != null && (typeof (mapped as any)[Symbol.iterator] === 'function' || typeof (mapped as any)[Symbol.asyncIterator] === 'function')) {
                    for await (const item of (mapped as AsyncIterable<U> | Iterable<U>)) {
                        yield item;
                    }
                } else {
                    yield mapped as U;
                }
            }
        })());
    }

    //Collectors

    public async forEach(callbackfn: (value: T, key: number, obj: AsyncVector<T>) => void | Promise<void>): Promise<void> {
        for await (const [key, value] of this.entries())
            await callbackfn(value, key, this);
    }

    public async reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentKey: number, obj: AsyncVector<T>) => U | Promise<U>, initialValue: U): Promise<U> {
        let accumulator = initialValue;
        for await (const [key, value] of this.entries()) {
            accumulator = await callbackfn(accumulator, value, key, this);
        }
        return accumulator;
    }

    public async every(predicate: (value: T, key: number, obj: AsyncVector<T>) => boolean | undefined | null | Promise<boolean | undefined | null>): Promise<boolean> {
        for await (const [key, value] of this.entries()) {
            if (!(await predicate(value, key, this))) {
                return false;
            }
        }
        return true;
    }

    public async some(predicate: (value: T, key: number, obj: AsyncVector<T>) => boolean | undefined | null | Promise<boolean | undefined | null>): Promise<boolean> {
        for await (const [key, value] of this.entries()) {
            if (await predicate(value, key, this)) {
                return true;
            }
        }
        return false;
    }

    public async find<S extends T>(predicate: (value: T, key: number, obj: AsyncVector<T>) => boolean | undefined | null | Promise<boolean | undefined | null>): Promise<S | undefined> {
        for await (const [key, value] of this.entries()) {
            if (await predicate(value, key, this)) {
                return value as S;
            }
        }
        return undefined;
    }

    public collect<C>(collector: (iterable: AsyncIterable<T>) => Promise<C>): Promise<C> {
        return collector(this);
    }

    // Aggregators

    public async count(): Promise<number> {
        let i = 0;
        for await (const _ of this.#getDataset()) i++
        return i;
    }

    public async sum(this: AsyncVector<number>): Promise<number> {
        let sum = 0;
        for await (const value of this.#getDataset()) sum += value;
        return sum;
    }

    public async min(this: AsyncVector<number>): Promise<number> {
        let min: number = Number.POSITIVE_INFINITY;
        for await (const value of this.#getDataset())
            if (value < min) min = value;
        return min;
    }

    public async max(this: AsyncVector<number>): Promise<number> {
        let max: number = Number.NEGATIVE_INFINITY;
        for await (const value of this.#getDataset())
            if (value > max) max = value;
        return max;
    }

    public async mean(this: AsyncVector<number>): Promise<number> {
        let count = 0;
        let sum = 0;
        for await (const value of this.#getDataset()) {
            sum += value;
            count++;
        }
        return sum / count;
    }

    public async median(this: AsyncVector<number>): Promise<number> {
        const values = new ArrayList<number>();
        for await (const value of this.filter(n => !isna(n)))
            values.push(value);
        values.sort((a, b) => a - b);

        const len = values.length;
        if (len === 0) return NaN;

        const mid = Math.floor(len / 2);
        return len % 2 !== 0
            ? values[mid]
            : (values[mid - 1] + values[mid]) / 2;
    }

    //Iterators

    public async *keys(): AsyncIterableIterator<number> {
        let i = 0;
        for await (const _ of this.#getDataset())
            yield i++;
    }

    public async *values(): AsyncIterableIterator<T> {
        yield* this.#getDataset();
    }

    public async *entries(): AsyncIterableIterator<[number, T]> {
        let i = 0;
        for await (const value of this.#getDataset())
            yield [i++, value];
    }

    [Symbol.asyncIterator](): AsyncIterableIterator<T> {
        return this.values();
    }

    [Symbol.toStringTag] = "AsyncVector";


    public static from<U>(iterable: Iterable<U | Promise<U>> | AsyncIterable<U>): AsyncVector<U> {
        return new AsyncVector(async function* () {
            for await (const item of iterable) {
                yield item;
            }
        });
    }

    public static of<U>(...items: U[]): AsyncVector<U> {
        return AsyncVector.from(items);
    }
}