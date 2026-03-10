//import { TreeMap, HashMap } from "@easylib.ts/structures/map";

/*export const NA = NaN as unknown;
export type NA = typeof NA;

export const isna = (value: any) => isNaN(value);*/

interface MapAccessor<K, V> extends Map<K, V> { }

/*export class Series<K, V> implements MapAccessor<K, V> {
    #dataByKey = new HashMap<K, V>();
    #dataByPos = new HashMap<number, V>();

    constructor(values: Iterable<[K, V]>) {
        let i = 0
        for (const [key, value] of values) {
            this.#dataByKey.set(key, value);
            this.#dataByPos.set(i++, value);
        }
    }
    clear(): void {
        throw new Error("Method not implemented.");
    }
    delete(key: K): boolean {
        throw new Error("Method not implemented.");
    }
    forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void {
        throw new Error("Method not implemented.");
    }
    get(key: K): V | undefined {
        throw new Error("Method not implemented.");
    }
    has(key: K): boolean {
        throw new Error("Method not implemented.");
    }
    set(key: K, value: V): this {
        throw new Error("Method not implemented.");
    }

    get size(): number {
        return this.#dataByKey.size;
    }

    get loc(): MapAccessor<K, V> {
        return this.#dataByKey;
    }

    get iloc(): MapAccessor<number, V> {
        return this.#dataByPos;
    }

    public map<U>(callbackfn: (value: V, key: K, obj: MapAccessor<K, V>) => U): Series<K, U>
    public map<U>(iterable: Iterable<K, V>): Series<K, V>
    public map<U>(args: ((value: V, key: K, obj: MapAccessor<K, V>) => U) | Iterable<K, V>): Series<K, U | V> {
        if (typeof args === 'function')
            return new Series(this.#dataByKey.map(args));
        const obj = new Series(this);
        for (const [key, value] of this.#dataByKey)
            obj.#dataByKey.set(key, value);
        return obj;
    }

    public apply<U>(callbackfn: (value: V, key: K, obj: MapAccessor<K, V>) => U, start: number = 0, end: number = this.#dataByKey.size): Series<K, U | V> {
        const map = new HashMap<K, U | V>();
        let i = 0;
        for (const [key, value] of this.#dataByKey) {
            if (i >= start)
                map.set(key, callbackfn(value, key, this.#dataByKey));
            else if (i <= end)
                map.set(key, value);
            i++;
        }
        return new Series(map.entries());
    }

    public isna(): Series<K, boolean> {
        return this.map((value) => value === undefined);
    }

    public fillna(value: V): Series<K, V> {
        return this.map(item => item === undefined ? value : item);
    }


    public mul(value: number): Series<K, number> {
        return this.map(item => Number(item) * value);
    }

    public div(value: number): Series<K, number> {
        return this.map(item => Number(item) / value);
    }

    public add(value: number): Series<K, number> {
        return this.map(item => Number(item) + value);
    }

    public sub(value: number): Series<K, number> {
        return this.map(item => Number(item) - value);
    }

    public and(series: Series<K, boolean>): Series<K, boolean> {
        series.map((value, key) => this.)
    }

    public or(series: Series<K, boolean>): Series<K, boolean> {

    }

    public not(series: Series<K, boolean>): Series<K, boolean> {

    }


    public sum() {

    }

    public min() {

    }

    public max() {

    }

    public mean() {

    }

    public median() {

    }

    public sort_values(ascending: boolean = false) {

    }

    public value_counts() {

    }

    
    public keys(): MapIterator<K> {
        return this.#dataByKey.keys();
    }

    public values(): MapIterator<V> {
        return this.#dataByKey.values();
    }

    public entries(): MapIterator<[K, V]> {
        return this.#dataByKey.entries();
    }

    [Symbol.iterator](): IterableIterator<[K, V]> {
        return this.#dataByKey.entries();
    }

    [Symbol.toStringTag]: string = "Series";
}

/*public static LocAccessor = class <K, V> implements MapAccessor<K, V> {
        #series: Series<K, V>;

        constructor(series: Series<K, V>) {
            this.#series = series;
        }

        get size(): number {
            return this.#series.#dataByKey.size;
        }

        public get(key: K): V | undefined {
            return this.#series.#dataByKey.get(key);
        }

        public set(key: K, value: V): this {
            this.#series.#dataByKey.set(key, value);
            return this;
        }

        public has(key: K): boolean {
            return this.#series.#dataByKey.has(key);
        }

        public clear(): void {
            this.#series.#dataByKey.clear();
        }

        public delete(key: K): boolean {
            return this.#series.#dataByKey.delete(key);
        }

        public forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void {
            return this.#series.#dataByKey.forEach(callbackfn.bind(thisArg));
        }

        public *keys(): MapIterator<K> {
            throw new Error("Method not implemented.");
        }
        public *values(): MapIterator<V> {
            throw new Error("Method not implemented.");
        }
        public *entries(): MapIterator<[K, V]> {
            throw new Error("Method not implemented.");
        }

        [Symbol.iterator](): MapIterator<[K, V]> {
            throw new Error("Method not implemented.");
        }

        [Symbol.toStringTag]: string = "Accessor";
    }*/

/*export type Key = number | string;

export class Vector<T> {
    #getDataset: () => Iterable<[Key, T | undefined]>;

    constructor(generator: () => Iterable<[Key, T | undefined]>) {
        this.#getDataset = generator;
    }

    public combine<S, U>(other: Iterable<[Key, S]>, combineFn: (left: T | undefined, right: S | undefined) => U | undefined = (l, r) => [l, r] as U): Vector<U> {
        const selfValues = new TreeMap(this.entries());
        const otherValues = new HashMap(other)

        const self = this;

        function* keyIterator(): IterableIterator<Key> {
            yield* self.keys();

            for (const item of other)
                yield Array.isArray(item) ? item[0] : item;
        }

        function* iterator(): IterableIterator<[Key, U | undefined]> {
            for (const key of treeSort(keyIterator(), (a, b) => a > b ? 1 : -1))
                yield [key, combineFn(selfValues.get(key), otherValues.get(key))];
        }

        return new Vector(iterator);
    }

    public apply<S>(fn: (entry: [Key, T | undefined]) => [Key, S]): Vector<S> {
        const self = this;

        function* iterator(): IterableIterator<[Key, S]> {
            for (const entry of self.entries())
                yield fn(entry);
        }

        return new Vector(iterator);
    }

    public map<S>(fn: (value: T | undefined, key: Key) => S): Vector<S> {
        const self = this;

        function* iterator(): IterableIterator<[Key, S]> {
            for (const [key, value] of self.entries())
                yield [key, fn(value, key)];
        }

        return new Vector(iterator);
    }

    public mul<S>(value: Iterable<[Key, S]> | number): Vector<number> {
        if (typeof value === 'number') {
            return this.apply(([key, val]) => [key, val === '' ? NaN : Number(val) * value])
        }
        return this.combine<S, number>(value, (left, right) => (left === '' ? NaN : Number(left)) * (right === '' ? NaN : Number(right)));
    }

    public div<S>(value: Iterable<[Key, S]> | number): Vector<number> {
        if (typeof value === 'number') {
            return this.apply(([key, val]) => [key, val === '' ? NaN : Number(val) / value])
        }
        return this.combine<S, number>(value, (left, right) => (left === '' ? NaN : Number(left)) / (right === '' ? NaN : Number(right)));
    }

    public add<S>(value: Iterable<[Key, S]> | number): Vector<number> {
        if (typeof value === 'number') {
            return this.apply(([key, val]) => [key, val === '' ? NaN : Number(val) + value])
        }
        return this.combine<S, number>(value, (left, right) => (left === '' ? NaN : Number(left)) + (right === '' ? NaN : Number(right)));
    }

    public sub<S>(value: Iterable<[Key, S]> | number): Vector<number> {
        if (typeof value === 'number') {
            return this.apply(([key, val]) => [key, val === '' ? NaN : Number(val) - value])
        }
        return this.combine<S, number>(value, (left, right) => (left === '' ? NaN : Number(left)) - (right === '' ? NaN : Number(right)));
    }


    public and<S>(value: Iterable<[Key, S]>): Vector<boolean> {
        return this.combine<S, boolean>(value, (left, right) => left === undefined || right === undefined ? undefined : Boolean(left) && Boolean(right));
    }

    public or<S>(value: Iterable<[Key, S]>): Vector<boolean> {
        return this.combine<S, boolean>(value, (left, right) => left === undefined || right === undefined ? undefined : Boolean(left) || Boolean(right));
    }

    public not(): Vector<boolean> {
        const self = this;

        function* iterator(): IterableIterator<[Key, boolean | undefined]> {
            for (const [key, value] of self.entries())
                yield [key, value === undefined ? undefined : !Boolean(value)]
        }

        return new Vector(iterator);
    }

    public sort(compareFn: (a: [Key, T | undefined], b: [Key, T | undefined]) => number): Vector<T> {
        const sorted = mergeSort<[Key, T | undefined]>(this.entries(), compareFn);
        return new Vector(() => sorted.values());
    }

    public aggregate(): Aggregator<T> {
        return new Aggregator(this.#getDataset);
    }

    public *keys(): IterableIterator<Key> {
        for (const [key] of this.#getDataset())
            yield key;
    }

    public *values(): IterableIterator<T | undefined> {
        for (const [, value] of this.#getDataset())
            yield value;
    }

    public *entries(): IterableIterator<[Key, T | undefined]> {
        yield* this.#getDataset();
    }

    [Symbol.iterator](): IterableIterator<[Key, T | undefined]> {
        return this.entries();
    }
}

export class Aggregator<T> {
    #getDataset: () => Iterable<[Key, T | undefined]>;

    constructor(generator: () => Iterable<[Key, T | undefined]>, public compareFn: (a: [Key, T | undefined], b: [Key, T | undefined]) => number = (a, b) => a == b ? 0 : a < b ? -1 : 1) {
        this.#getDataset = generator;
    }

    public count(): number {
        let i = 0;
        for (const _ of this.#getDataset()) i++
        return i;
    }

    public sum(): number {
        let sum = 0;
        for (const value of this.#getDataset()) sum += Number(value)
        return sum;
    }

    public min(): [Key, T | undefined] | undefined {
        let min: [Key, T | undefined] | undefined = undefined;
        for (const tuple of this.#getDataset())
            if (min === undefined || this.compareFn(tuple, min) < 0)
                min = tuple;
        return min;
    }

    public max(): [Key, T | undefined] | undefined {
        let max: [Key, T | undefined] | undefined = undefined;
        for (const tuple of this.#getDataset())
            if (max === undefined || this.compareFn(tuple, max) > 0)
                max = tuple;
        return max;
    }

    public mean(): number {
        let count = 0;
        let sum = 0;
        for (const [, value] of this.#getDataset()) {
            sum += Number(value);
            count++;
        }
        return sum / count;
    }

    public median(): number {
        const values = Array.from(this.#getDataset())
            .map(([, v]) => Number(v))
            .filter(n => !isNaN(n))
            .sort((a, b) => a - b);

        const len = values.length;
        if (len === 0) return NaN;

        const mid = Math.floor(len / 2);
        return len % 2 !== 0
            ? values[mid]
            : (values[mid - 1] + values[mid]) / 2;
    }

    public value_counts(): IterableIterator<[T, number]> {
        const occ = new HashMap<T, number>();
        for (const [, value] of this.#getDataset())
            if (value !== undefined)
                occ.set(value, (occ.get(value) ?? 0) + 1);
        return occ.entries();
    }
}*/