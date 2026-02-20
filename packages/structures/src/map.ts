import { Functionals, NonLinear } from "./interfaces";

interface MapInterface<K, V> extends NonLinear<K, V>, Functionals<K, V> {
    set(key: K, value: V): this;
    get(key: K): V | undefined;

    [Symbol.iterator](): IterableIterator<[K, V]>;
}

export { MapInterface as Map };

export interface HashMap<K, V> {
    forEach(callbackfn: (value: V, key: K, map: HashMap<K, V>) => void): void;
}
export class HashMap<K, V> extends Map<K, V> implements MapInterface<K, V> {

    public forEach(callbackfn: (value: V, key: K, map: any) => void): void {
        for (const [key, value] of this.entries())
            callbackfn(value, key, this);
    }

    public map<U>(callbackfn: (value: V, key: K, obj: HashMap<K, V>) => U): HashMap<K, U> {
        const newMap = new HashMap<K, U>();
        for (const [key, value] of this.entries())
            newMap.set(key, callbackfn(value, key, this));
        return newMap;
    }

    public reduce<U>(callbackfn: (previousValue: U, currentValue: V, currentKey: K, obj: HashMap<K, V>) => U, initialValue: U): U {
        let curr = initialValue;
        for (const [key, value] of this.entries())
            curr = callbackfn(curr, value, key, this);
        return curr;
    }

    public every(predicate: (value: V, key: K, obj: HashMap<K, V>) => unknown): boolean {
        for (const [key, value] of this.entries())
            if (!predicate(value, key, this))
                return false;
        return true;
    }

    public some(predicate: (value: V, key: K, obj: HashMap<K, V>) => unknown): boolean {
        for (const [key, value] of this.entries())
            if (predicate(value, key, this))
                return true;
        return false;
    }

    public filter<S extends V>(predicate: (value: V, key: K, obj: HashMap<K, V>) => value is S): HashMap<K, S> {
        const newMap = new HashMap<K, S>();
        for (const [key, value] of this.entries())
            if (predicate(value, key, this))
                newMap.set(key, value);
        return newMap;
    }

    public find<S extends V>(predicate: (value: V, key: K, obj: HashMap<K, V>) => value is S): S | undefined {
        for (const [key, value] of this.entries())
            if (predicate(value, key, this))
                return value;
        return undefined;
    }

    public get [Symbol.toStringTag]() { return 'HashMap'; }
}