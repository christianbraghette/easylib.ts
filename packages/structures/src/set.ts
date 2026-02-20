import { Functionals, NonLinear } from "./interfaces";
import { HashMap } from "./map";

interface SetItenterface<V> extends NonLinear<V, V>, Functionals<V, V> {
    add(value: V): this;

    [Symbol.iterator](): IterableIterator<V>;
}

export { SetItenterface as Set };


export class HashSet<V> extends Set<V> implements SetItenterface<V> {

    public map<U>(callbackfn: (value: V, key: V, obj: HashSet<V>) => U): HashMap<V, U> {
        const map = new HashMap<V, U>();
        for (const value of this)
            map.set(value, callbackfn(value, value, this));
        return map;
    }

    public reduce<U>(callbackfn: (previousValue: U, currentValue: V, currentKey: V, obj: HashSet<V>) => U, initialValue: U): U {
        let curr = initialValue;
        for (const value of this)
            curr = callbackfn(curr, value, value, this);
        return curr;
    }

    public every(predicate: (value: V, key: V, obj: HashSet<V>) => unknown): boolean {
        for (const value of this)
            if (!predicate(value, value, this))
                return false;
        return true;
    }

    public some(predicate: (value: V, key: V, obj: HashSet<V>) => unknown): boolean {
        for (const value of this)
            if (predicate(value, value, this))
                return true;
        return false;
    }

    public filter<S extends V>(predicate: (value: V, key: V, obj: HashSet<V>) => value is S): HashSet<S> {
        const newSet = new HashSet<S>();
        for (const value of this)
            if (predicate(value, value, this))
                newSet.add(value);
        return newSet;
    }

    public find<S extends V>(predicate: (value: V, key: V, obj: HashSet<V>) => value is S): S | undefined {
        for (const value of this)
            if (predicate(value, value, this))
                return value;
    }

}
