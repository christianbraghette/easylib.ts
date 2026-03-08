import { HashMap } from "@easylib.ts/structures/map";

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
