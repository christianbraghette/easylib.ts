import { CombinedIterable } from ".";
import { mergeSort } from "./sorter";

export class Vector<T> {
    #getDataset: () => Iterable<T | null>;

    constructor(generator: () => Iterable<T | null>) {
        this.#getDataset = generator;
    }

    /**
     * @time `O(NlogN)`
     * @param combineFn 
     */
    public combine<S, U>(other: Iterable<S>, combineFn: (self: T | null, other: S | null) => U | null = (l, r) => [l, r] as U): Vector<U> {
        const iterable = new CombinedIterable<[T | null, S | null]>(this.values(), other);
        
        function *iterator(): IterableIterator<U | null> {
            for (const [left, right] of iterable)
                yield combineFn(left, right);
        }

        return new Vector(() => iterator());
    }

    public apply<S>(fn: (value: T | null, index: number) => S): Vector<S> {
        const self = this;

        function* iterator(): IterableIterator<S> {
            for (const [index, value] of self.entries())
                yield fn(value, index);
        }

        return new Vector(iterator);
    }

    public mul<S>(value: Iterable<S> | number): Vector<number> {
        if (typeof value === 'number') {
            return this.apply((val) => val === '' ? NaN : Number(val) * value);
        }
        return this.combine<S, number>(value, (left, right) => (left === '' ? NaN : Number(left)) * (right === '' ? NaN : Number(right)));
    }

    public div<S>(value: Iterable<S> | number): Vector<number> {
        if (typeof value === 'number') {
            return this.apply((val) => val === '' ? NaN : Number(val) / value)
        }
        return this.combine<S, number>(value, (left, right) => (left === '' ? NaN : Number(left)) / (right === '' ? NaN : Number(right)));
    }

    public add<S>(value: Iterable<S> | number): Vector<number> {
        if (typeof value === 'number') {
            return this.apply((val) => val === '' ? NaN : Number(val) + value)
        }
        return this.combine<S, number>(value, (left, right) => (left === '' ? NaN : Number(left)) + (right === '' ? NaN : Number(right)));
    }

    public sub<S>(value: Iterable<S> | number): Vector<number> {
        if (typeof value === 'number') {
            return this.apply((val) => val === '' ? NaN : Number(val) - value)
        }
        return this.combine<S, number>(value, (left, right) => (left === '' ? NaN : Number(left)) - (right === '' ? NaN : Number(right)));
    }


    public and<S>(value: Iterable<S>): Vector<boolean> {
        return this.combine<S, boolean>(value, (left, right) => left === undefined || right === undefined ? null : Boolean(left) && Boolean(right));
    }

    public or<S>(value: Iterable<S>): Vector<boolean> {
        return this.combine<S, boolean>(value, (left, right) => left === undefined || right === undefined ? null : Boolean(left) || Boolean(right));
    }

    public not(): Vector<boolean> {
        const self = this;

        function* iterator(): IterableIterator<boolean | null> {
            for (const value of self.values())
                yield value === undefined ? null : !Boolean(value)
        }

        return new Vector(iterator);
    }

    public sort(compareFn: (a: T | null, b: T | null) => number): Vector<T> {
        const sorted = mergeSort<T | null>(this.values(), compareFn);
        return new Vector(() => sorted.values());
    }

    public *keys(): IterableIterator<number> {
        let i = 0;
        for (const _ of this.#getDataset())
            yield i++;
    }

    public *values(): IterableIterator<T | null> {
        yield* this.#getDataset();
    }

    public *entries(): IterableIterator<[number, T | null]> {
        let i = 0;
        for (const value of this.#getDataset())
            yield [i++, value];
    }

    [Symbol.iterator](): IterableIterator<T | null> {
        return this.values();
    }
}