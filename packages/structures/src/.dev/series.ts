import { Iterables } from ".";
import { ArrayList } from "./list";
import { HashMap, TreeMap } from "./map";
import { Vector } from "./vector";

interface LocAccessor<T> extends Iterable<T> {
    [key: Key]: T;
}

interface ILocAccessor<T> extends Iterable<T> {
    [key: number]: T;
}

type Key = number | string;

export class Series<V> {
    #map = new TreeMap<Key, number>((a, b) => a == b ? 0 : a < b ? -1 : 1);
    #keys = new ArrayList<Key>()
    #values = new ArrayList<V>();

    constructor(values: Iterable<[Key, V]>) {
        let i = 0
        for (const [key, value] of values) {
            this.#map.set(key, i);
            this.#keys.push(key);
            this.#values.push(value);
            i++;
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

    get vect(): Vector<V> {
        return new Vector(() => this.values());
    }

    set vect(iterable: Iterable<V>) {
        this.#values = new ArrayList(iterable);
    }

    /*get agg(): Aggregator<V> {
        return new Aggregator(() => this.entries());
    }*/

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
        const combined = Iterables.combine<[boolean | null, [Key, V]]>(iterable, this.entries());

        function* iterator(): IterableIterator<[Key, S]> {
            for (const [mask, entry] of combined)
                if (mask === true)
                    yield entry as [Key, S];
        }

        return new Series(iterator())
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

    public keys(): IterableIterator<Key> {
        return this.#keys.values();
    }

    public values(): IterableIterator<V> {
        return this.#values.values();
    }

    public entries(): IterableIterator<[Key, V]> {
        return Iterables.combine<[Key, V]>(this.keys(), this.values())[Symbol.iterator]();
    }

    [Symbol.iterator](): IterableIterator<[Key, V | null]> {
        return this.entries();
    }

    [Symbol.toStringTag]: string = "Series";

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
                            if (pos)
                                return target.#series.#values[pos];
                        }
                    }
                    return Reflect.get(target, prop, receiver);
                },
                set: (target, prop, value, receiver) => {
                    if (typeof prop === 'string') {
                        if (target.#series.#map.has(prop as Key)) {
                            const pos = target.#series.#map.get(prop as Key);
                            if (pos) {
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
}