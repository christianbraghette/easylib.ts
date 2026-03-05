import { HashMap } from "@easylib.ts/structures/map";

class Series<K, V> {
    #dataByPos = new HashMap<number, V>();
    #dataByKey?: HashMap<K, V>;

    constructor(values: Iterable<V>, keys?: Iterable<K>) {
        let i = 0
        for (const value of values)
            this.#dataByPos.set(i++, value);
        if (keys) {
            this.#dataByKey = new HashMap();
            i = 0;
            for (const key of keys)
                this.#dataByKey.set(key, this.#dataByPos.get(i)!);
        }
    }

    public loc(key: K): V | undefined {
        //return this.#dataByKey.get(key);
        return;
    }

    public iloc(index: number): V | undefined {
        return this.#dataByPos.get(index);
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

    *[Symbol.iterator]() {

    }
}