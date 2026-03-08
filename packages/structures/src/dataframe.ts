import { IndexableIterable, Tuple } from ".";
import { ArrayList } from "./list";
import { HashMap } from "./map";
import { Aggregator, Vector } from "./vector";

/*class Series<T> {
    #map: HashMap<>;

    constructor(iterable: Iterable<T>) {

    }

    public vector() {
        return this.
    }
}*/

class Index<T> extends Vector<T> {
    [key: number]: T;

    #array: HashMap<number, T>;

    constructor(iterable?: Iterable<T>) {
        const array = new HashMap<number, T>();
        let i = 0;
        for (const value of iterable ?? [])
            array.set(i, value);
        super(() => array.entries());
        this.#array = array;

        return new Proxy(this, {
            get: (target, prop) => {
                if (typeof prop === 'string' && /^\d+$/.test(prop)) {
                    return target.#array.get(Number(prop));
                }
                return Reflect.get(target, prop);
            },
            set: (target, prop, value) => {
                if (typeof prop === 'string' && /^\d+$/.test(prop)) {
                    target.#array.set(Number(prop), value);
                    return true;
                }
                return Reflect.set(target, prop, value);
            }
        })
    }
}

export class DataFrame<T extends Record<string, any>> {
    [key: string]: Index<T[keyof T]>;

    #map = new HashMap<keyof T, Index<T[keyof T]>>();

    constructor(iterable: Iterable<Tuple<(T[keyof T])[]>>, columns: (keyof T)[]) {
        const indexable = new IndexableIterable(iterable);

        for (let i = 0; i < columns.length; i++)
            this.#map.set(columns[i], new Index(indexable[i] as unknown as IndexableIterable<T[keyof T]>))
    }
}