import { HashMap } from "./map";
import { mergeSort, treeSort } from "./sorter";

type Key = string | number;

export class Vector<T> {
    #getDataset: () => Iterable<[Key, T | undefined]>;

    constructor(generator: () => Iterable<[Key, T | undefined]>) {
        this.#getDataset = generator;
    }

    /**
     * @time `O(NlogN)`
     * @param combineFn 
     */
    public combine<S, U>(other: Iterable<[Key, S]>, combineFn: (left: T | undefined, right: S | undefined) => U | undefined = (l, r) => [l, r] as U): Vector<U> {
        const selfValues = new HashMap(this.entries());
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

    public apply<S>(fn: (value: T | undefined) => S): Vector<S> {
        const self = this;

        function* iterator(): IterableIterator<[Key, S]> {
            for (const [key, value] of self.entries())
                yield [key, fn(value)];
        }

        return new Vector(iterator);
    }

    public mul<S>(value: Iterable<[Key, S]> | number): Vector<number> {
        if (typeof value === 'number') {
            return this.apply(val => val === '' ? NaN : Number(val) * value)
        }
        return this.combine<S, number>(value, (left, right) => (left === '' ? NaN : Number(left)) * (right === '' ? NaN : Number(right)));
    }

    public div<S>(value: Iterable<[Key, S]> | number): Vector<number> {
        if (typeof value === 'number') {
            return this.apply(val => val === '' ? NaN : Number(val) / value)
        }
        return this.combine<S, number>(value, (left, right) => (left === '' ? NaN : Number(left)) / (right === '' ? NaN : Number(right)));
    }

    public add<S>(value: Iterable<[Key, S]> | number): Vector<number> {
        if (typeof value === 'number') {
            return this.apply(val => val === '' ? NaN : Number(val) + value)
        }
        return this.combine<S, number>(value, (left, right) => (left === '' ? NaN : Number(left)) + (right === '' ? NaN : Number(right)));
    }

    public sub<S>(value: Iterable<[Key, S]> | number): Vector<number> {
        if (typeof value === 'number') {
            return this.apply(val => val === '' ? NaN : Number(val) - value)
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
        return new Vector(mergeSort<[Key, T | undefined]>(this.entries(), compareFn).values);
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
}