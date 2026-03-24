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

import { Tuple } from "./index";
import { Collection } from "./collections";
import { ArrayList } from "./list";
import { HashMap, TreeMap } from "./map";


interface LocAccessor<T> extends Iterable<T> {
    [key: Key]: T;
}

interface ILocAccessor<T> extends Iterable<T> {
    [key: number]: T;
}

type Key = number | string;

function isna(value: any) {
    return value === undefined || value === null || (typeof value === 'number' && isNaN(value));
}

export class Series<V> {
    #map = new TreeMap<Key, number>((a, b) => a == b ? 0 : a < b ? -1 : 1);
    #keys = new ArrayList<Key>()
    #values = new ArrayList<V>();

    constructor(values: Iterable<[Key, V]>)
    constructor(length: number)
    constructor(values: Iterable<[Key, V]> | number) {
        if (typeof values === 'number') {
            this.#keys = new ArrayList<Key>(values)
            this.#values = new ArrayList<V>(values);
        } else {
            let i = 0;
            for (const [key, value] of values) {
                this.#map.set(key, i);
                this.#keys.push(key);
                this.#values.push(value);
                i++;
            }
        }
    }

    get length(): number {
        return this.#keys.length;
    }

    get loc(): LocAccessor<V> {
        return new Series.LocAccessor(this);
    }

    get iloc(): ILocAccessor<V> {
        return new Series.ILocAccessor(this);
    }

    public combine<S, U>(combineFn: (...values: (V | S)[]) => U, ...others: Series<S>[]): Series<U> {
        const activeIterators = Pipe.from<Series<S | V>>([this, ...others as any])
            .map(it => {
                const iterator = it[Symbol.iterator]();
                return { iterator, current: iterator.next() };
            })
            .filter(res => !res.current.done)
            .collect(ArrayList.from).valueOf();

        return new Series((function* () {
            while (activeIterators.length > 0) {
                let [pipe, pipe1] = activeIterators.pipe().tee().valueOf();

                const minKey = pipe1.map<Key>(node => node.current.value[0]).min().valueOf();

                let pipe2
                [pipe, pipe2] = pipe.filter(node => node.current.value[0] === minKey).tee().valueOf();

                yield [minKey!, combineFn(...pipe2.map(node => node.current.value[1]))];

                pipe.forEach(node => {
                    node.current = node.iterator.next();
                    if (node.current.done) {
                        activeIterators.remove(node);
                    }
                });
            }
        })()
        )
    }

    public apply<S>(fn: (value: V, key: Key, index: number) => S): Series<S>
    public apply<S>(iterable: Iterable<[Key, S]>): Series<S | V>
    public apply<S>(fn: ((value: V, key: Key, index: number) => S) | Iterable<[Key, S]>): Series<S | V> {
        if (typeof fn === 'function') {
            const self = this;

            function* iterator(): IterableIterator<[Key, S]> {
                for (const [key, value] of self.entries())
                    yield [key, (fn as Function)(value, key)];
            }

            return new Series<S | V>(iterator());
        }
        const series = new Series<S | V>(this.entries());
        for (const [key, value] of fn)
            series.loc[key] = value;
        return series;
    }

    public mask<S extends V>(iterable: Iterable<boolean | null>): Series<S> {
        return new Series(
            Pipe.from(iterable)
                .zip(this.entries())
                .filter<[boolean, [Key, V]]>(entry => entry !== null && entry[0])
                .map(([_, val]) => val as [Key, S])
        );
    }

    public sort_values(ascending: boolean = false) {
        const values = ascending ? [1, -1] : [-1, 1];
        const sortedValues = this.#values.map<[number, V]>((value, index) => [index, value]).sort(([, a], [, b]) => a == b ? 0 : a! < b! ? values[0] : values[1]);
        this.#values = sortedValues.map(([, value]) => value);
        const keys = new ArrayList<Key>(sortedValues.length);

        this.#map.clear();
        for (const [pos, [oldPos]] of sortedValues.entries()) {
            keys[pos] = this.#keys[oldPos];
            this.#map.set(this.#keys[oldPos], pos);
        }

        this.#keys = keys;
    }

    public value_counts(): IterableIterator<[V, number]> {
        const occ = new HashMap<V, number>();
        for (const value of this.values())
            if (value)
                occ.set(value, (occ.get(value) ?? 0) + 1);
        return occ.entries();
    }

    //Operations

    public mul(this: Series<number>, value: number): Series<number>
    public mul(this: Series<number>, iterable: Series<number>): Series<number>
    public mul(this: Series<number>, arg: Series<number> | number): Series<number> {
        if (typeof arg === 'number') {
            return this.apply((val) => val * arg);
        }
        return this.combine<number, number>((left, right) => left * right, arg);
    }

    public div(this: Series<number>, value: number): Series<number>
    public div(this: Series<number>, iterable: Series<number>): Series<number>
    public div(this: Series<number>, arg: Series<number> | number): Series<number> {
        if (typeof arg === 'number') {
            return this.apply((val) => val / arg);
        }
        return this.combine<number, number>((left, right) => left / right, arg);
    }

    public add(this: Series<number>, value: number): Series<number>
    public add(this: Series<number>, iterable: Series<number>): Series<number>
    public add(this: Series<number>, arg: Series<number> | number): Series<number> {
        if (typeof arg === 'number') {
            return this.apply((val) => val + arg);
        }
        return this.combine<number, number>((left, right) => left + right, arg);
    }

    public sub(this: Series<number>, value: number): Series<number>
    public sub(this: Series<number>, iterable: Series<number>): Series<number>
    public sub(this: Series<number>, arg: Series<number> | number): Series<number> {
        if (typeof arg === 'number') {
            return this.apply((val) => val - arg);
        }
        return this.combine<number, number>((left, right) => left - right, arg);
    }

    public and<S>(value: Series<S>): Series<boolean | null> {
        return this.combine<S, boolean | null>((left, right) => isna(left) || isna(right) ? null : Boolean(left) && Boolean(right), value);
    }

    public or<S>(value: Series<S>): Series<boolean | null> {
        return this.combine<S, boolean | null>((left, right) => isna(left) || isna(right) ? null : Boolean(left) || Boolean(right), value);
    }

    public not(): Series<boolean | null> {
        const self = this;
        return new Series(
            (function* () {
                for (const [key, value] of self)
                    yield [key, isna(value) ? null : !Boolean(value)]
            })()
        );
    }

    public isna(): Series<boolean> {
        return this.apply((value) => isna(value));
    }

    public fillna(value: V): Series<V> {
        return this.apply(item => isna(item) ? value : item);
    }

    // Aggregators

    public sum(this: Series<number>): number {
        let sum = 0;
        for (const [_, value] of this) sum += value;
        return sum;
    }

    public min(this: Series<number>): number {
        let min: number = Number.POSITIVE_INFINITY;
        for (const [_, value] of this)
            if (value < min) min = value;
        return min;
    }

    public max(this: Series<number>): number {
        let max: number = Number.NEGATIVE_INFINITY;
        for (const [_, value] of this)
            if (value > max) max = value;
        return max;
    }

    public mean(this: Series<number>): number {
        let count = 0;
        let sum = 0;
        for (const [_, value] of this) {
            sum += value;
            count++;
        }
        return sum / count;
    }

    public median(this: Series<number>): number {
        const values = this.#values.filter(n => !isna(n)).sort((a, b) => a - b);

        const len = values.length;
        if (len === 0) return NaN;

        const mid = Math.floor(len / 2);
        return len % 2 !== 0
            ? values[mid]
            : (values[mid - 1] + values[mid]) / 2;
    }

    public summaryStatistics(this: Series<number>): { min: number, max: number, avg: number, sum: number, count: number } {
        let acc = { min: Infinity, max: -Infinity, avg: 0, sum: 0, count: 0 };
        for (const [_, curr] of this) {
            acc.sum += curr;
            acc.count++;
            if (acc.min > curr) acc.min = curr;
            if (acc.max < curr) acc.max = curr;
            acc.avg = acc.sum / acc.count;
        }
        return acc;
    }

    //Collection Methods

    public forEach(callbackfn: (value: V, key: Key, index: number, obj: Series<V>) => void): void {
        for (let i = 0; i < this.#map.size; i++)
            callbackfn(this.#values[i], this.#keys[i], i, this);
    }

    public map<U>(callbackfn: (value: V, key: Key, obj: Collection<Key, V>) => U): Series<U> {
        const cache = new Series<U>(this.#map.size);
        for (let i = 0; i < this.#map.size; i++)
            cache.loc[this.#keys[i]] = callbackfn(this.#values[i], this.#keys[i], this);
        return cache;
    }
    public reduce<U>(callbackfn: (previousValue: U, currentValue: V, currentKey: Key, index: number, obj: Collection<Key, V>) => U, initialValue: U): U {
        for (let i = 0; i < this.#map.size; i++)
            initialValue = callbackfn(initialValue, this.#values[i], this.#keys[i], i, this);
        return initialValue;
    }

    public every(predicate: (value: V, key: Key, index: number, obj: Collection<Key, V>) => unknown): boolean {
        for (let i = 0; i < this.#map.size; i++)
            if (!predicate(this.#values[i], this.#keys[i], i, this))
                return false;
        return true;
    }

    public some(predicate: (value: V, key: Key, index: number, obj: Collection<Key, V>) => unknown): boolean {
        for (let i = 0; i < this.#map.size; i++)
            if (predicate(this.#values[i], this.#keys[i], i, this))
                return true;
        return false;
    }

    public filter<S extends V>(predicate: (value: V, key: Key, index: number, obj: Collection<Key, V>) => unknown): Series<S> {
        const self = this;
        return new Series(
            (function* () {
                for (let i = 0; i < self.#map.size; i++)
                    if (predicate(self.#values[i], self.#keys[i], i, self))
                        yield [self.#keys[i], self.#values[i] as S];
            })()
        );
    }

    public find<S extends V>(predicate: (value: V, key: Key, index: number, obj: Collection<Key, V>) => unknown): S | undefined {
        for (let i = 0; i < this.#map.size; i++)
            if (predicate(this.#values[i], this.#keys[i], i, this))
                return this.#values[i] as S;
    }

    public clear(): void {
        this.#keys.clear();
        this.#values.clear();
        this.#map.clear();
    }

    public keys(): IterableIterator<Key> {
        return this.#keys.values();
    }

    public values(): IterableIterator<V> {
        return this.#values.values();
    }

    public *entries(): IterableIterator<[Key, V]> {
        for (let i = 0; i < this.#map.size; i++)
            yield [this.#keys[i], this.#values[i]];
    }

    [Symbol.iterator](): IterableIterator<[Key, V]> {
        return this.entries();
    }

    toJSON(): [Key, V][] {
        const cache = new Array(this.#map.size);
        for (let i = 0; i < this.#map.size; i++)
            cache[i] = [this.#keys[i], this.#values[i]];
        return cache;
    }

    get [Symbol.toStringTag](): string { return "Series"; };

    get [Symbol.isConcatSpreadable](): true { return true; }

    private static LocAccessor = class <T> implements LocAccessor<T> {
        [key: Key]: T;

        #series: Series<T>;

        constructor(series: Series<T>) {
            this.#series = series;

            return new Proxy(this, {
                get: (target, prop, receiver) => {
                    if (typeof prop === 'string') {
                        if (target.#series.#map.has(prop as Key)) {
                            const pos = target.#series.#map.get(prop as Key);
                            if (pos !== undefined)
                                return target.#series.#values[pos];
                        }
                    }
                    return Reflect.get(target, prop, receiver);
                },
                set: (target, prop, value, receiver) => {
                    if (typeof prop === 'string') {
                        if (target.#series.#map.has(prop as Key)) {
                            const pos = target.#series.#map.get(prop as Key);
                            if (pos !== undefined) {
                                target.#series.#values[pos] = value;
                                return true;
                            }
                        }
                    }
                    return Reflect.set(target, prop, value, receiver);
                }
            })
        }

        [Symbol.iterator](): IterableIterator<T> {
            return this.#series.#values.values();
        }
    }

    private static ILocAccessor = class <T> implements ILocAccessor<T> {
        [key: number]: T;

        #series: Series<T>;

        constructor(series: Series<T>) {
            this.#series = series;

            return new Proxy(this, {
                get: (target, prop) => {
                    if (typeof prop === 'string' && /^\d+$/.test(prop)) {
                        return target.#series.#values[Number(prop)];
                    }
                    return Reflect.get(target, prop);
                },
                set: (target, prop, value) => {
                    if (typeof prop === 'string' && /^\d+$/.test(prop)) {
                        target.#series.#values[Number(prop)] = value;
                        return true;
                    }
                    return Reflect.set(target, prop, value);
                }
            });
        }

        [Symbol.iterator](): IterableIterator<T> {
            return this.#series.#values.values();
        }
    }

    public static from<T>(iterable: Iterable<[Key, T]>): Series<T> {
        return new Series(iterable);
    }
}

export class DataFrame<DataMap extends Record<string, any>> extends Series<Tuple<DataMap[keyof DataMap][]>> {
    constructor(iterable: Iterable<Tuple<(DataMap[keyof DataMap])[]>>, columns: Tuple<(keyof DataMap & string)[]>, key?: keyof DataMap & string) {
        super(Pipe.from(iterable).map((value, index) => {
            if (!!key) {
                const pos = columns.indexOf(key);
                if (typeof value[pos] !== 'string' && typeof value[pos] !== 'number')
                    throw new Error("Invalid Key for the dataset");
                const val = value.filter((_, index) => index !== pos);
                return [value[pos] as string, val];
            }
            return [index, value];
        }).sink() as IterableIterator<[string | number, (DataMap[keyof DataMap])[]]>)
    }
}