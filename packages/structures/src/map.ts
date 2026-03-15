import { Collection, type Map as MapInterface } from "./collections";
import { ArrayList, LinkedList } from "./list";
import { Pipeline, SyncPipelineConstructor } from "./pipeline";

export class HashMap<K, V> extends Collection<K, V> implements MapInterface<K, V> {
    #map: Map<K, V>;

    /**
     * @param iterable An optional iterable of key-value pairs to initialize the map.
     */
    constructor(iterable?: Iterable<[K, V]>) {
        super()
        this.#map = new Map(iterable);
    }

    /**
     * Adds or updates an element with a specified key and value.
     * @param key The key of the element to add.
     * @param value The value of the element to add.
     * @returns The HashMap instance for method chaining.
     */
    public set(key: K, value: V): this {
        this.#map.set(key, value);
        return this;
    }

    /**
     * Returns a specified element from the map.
     * @param key The key of the element to return.
     * @returns The element associated with the specified key, or undefined if not found.
     */
    public get(key: K): V | undefined {
        return this.#map.get(key);
    }

    /**
     * Gets the number of elements in the map.
     */
    get size(): number {
        return this.#map.size;
    }

    /**
     * Returns a boolean indicating whether an element with the specified key exists or not.
     * @param key The key to test for presence.
     */
    public has(key: K): boolean {
        return this.#map.has(key);
    }

    /**
     * Removes the specified element from the map.
     * @param key The key of the element to remove.
     * @returns true if the element existed and was removed; false otherwise.
     */
    public delete(key: K): boolean {
        return this.#map.delete(key);
    }

    /**
     * Removes all elements from the map.
     */
    public clear(): void {
        this.#map.clear();
    }

    /**
     * Executes a provided function once per each key/value pair in the map.
     * @param callbackfn Function to execute for each element.
     */
    public forEach(callbackfn: (value: V, key: K, obj: HashMap<K, V>) => void): void {
        for (const [key, value] of this.entries()) {
            callbackfn(value, key, this);
        }
    }

    /**
     * Creates a new HashMap with the results of calling a provided function on every value in this map.
     * @param callbackfn Function that produces a value for the new HashMap.
     * @template U The type of values in the new HashMap.
     */
    public map<U>(callbackfn: (value: V, key: K, obj: HashMap<K, V>) => U): HashMap<K, U> {
        const newMap = new HashMap<K, U>();
        for (const [key, value] of this.entries()) {
            newMap.set(key, callbackfn(value, key, this));
        }
        return newMap;
    }

    /**
     * Executes a reducer function on each element of the map, resulting in a single output value.
     * @param callbackfn Function to execute on each element.
     * @param initialValue Value to use as the first argument to the first call of the callback.
     * @template U The type of the accumulator.
     */
    public reduce<U>(callbackfn: (previousValue: U, currentValue: V, currentKey: K, obj: HashMap<K, V>) => U, initialValue: U): U {
        let accumulator = initialValue;
        for (const [key, value] of this.entries()) {
            accumulator = callbackfn(accumulator, value, key, this);
        }
        return accumulator;
    }

    /**
     * Tests whether all elements in the map pass the test implemented by the provided function.
     * @param predicate Function to test each element.
     */
    public every(predicate: (value: V, key: K, obj: HashMap<K, V>) => boolean | undefined | null): boolean {
        for (const [key, value] of this.entries()) {
            if (!predicate(value, key, this)) return false;
        }
        return true;
    }

    /**
     * Tests whether at least one element in the map passes the test implemented by the provided function.
     * @param predicate Function to test each element.
     */
    public some(predicate: (value: V, key: K, obj: HashMap<K, V>) => boolean | undefined | null): boolean {
        for (const [key, value] of this.entries()) {
            if (predicate(value, key, this)) return true;
        }
        return false;
    }

    /**
     * Creates a new HashMap with all elements that pass the test implemented by the provided function.
     * @param predicate Function to test each element.
     * @template S The refined type of the values in the new HashMap.
     */
    public filter<S extends V>(predicate: (value: V, key: K, obj: HashMap<K, V>) => boolean | undefined | null): HashMap<K, S> {
        const result = new HashMap<K, S>();
        for (const [key, value] of this.entries()) {
            if (predicate(value, key, this)) {
                result.set(key, value as S);
            }
        }
        return result;
    }

    /**
     * Returns the value of the first element in the map that satisfies the provided testing function.
     * @param predicate Function to execute on each value.
     */
    public find<S extends V>(predicate: (value: V, key: K, obj: HashMap<K, V>) => boolean | undefined | null): S | undefined {
        for (const [key, value] of this.entries()) {
            if (predicate(value, key, this)) return value as S;
        }
        return undefined;
    }

    public pipe(): Pipeline<[K, V], 'sync'>
    public pipe<U>(transformer: (source: Pipeline<[K, V], 'sync'>) => Pipeline<[K, U], 'sync'>): HashMap<K, U>
    public pipe<U>(transformer?: (source: Pipeline<[K, V], 'sync'>) => Pipeline<[K, U], 'sync'>): HashMap<K, U> | Pipeline<[K, V], 'sync'> {
        const pipeline = new SyncPipelineConstructor(this.entries())
        if (!transformer)
            return pipeline;
        return new HashMap(transformer(pipeline).sink());
    }

    public sort(compareFn: (a: [K, V], b: [K, V]) => number): this {
        const entries = new ArrayList(this.#map.entries());

        entries.sort(compareFn);

        this.#map.clear();

        for (const [key, value] of entries) {
            this.#map.set(key, value);
        }

        return this;
    }

    /**
     * Returns a new Iterator object that contains the keys for each element in the map.
     */
    public keys(): IterableIterator<K> {
        return this.#map.keys();
    }

    /**
     * Returns a new Iterator object that contains the values for each element in the map.
     */
    public values(): IterableIterator<V> {
        return this.#map.values();
    }

    /**
     * Returns a new Iterator object that contains the [key, value] pairs for each element in the map.
     */
    public entries(): IterableIterator<[K, V]> {
        return this.#map.entries();
    }

    /**
     * Default iterator for the class, allowing usage in for...of loops.
     */
    [Symbol.iterator](): IterableIterator<[K, V]> {
        return this.entries();
    }

    toJSON(): [K, V][] {
        const array = new Array<[K, V]>(this.#map.size);
        let i = 0;
        for (const entry of this)
            array[i++] = entry;
        return array;
    }

    get [Symbol.toStringTag](): string { return "HashMap" };

    public static from<R, S>(iterable: Iterable<[R, S]>): HashMap<R, S> {
        return new HashMap(iterable);
    }
}

enum Color { RED, BLACK }

class BSTNode {
    public left?: BSTNode;
    public right?: BSTNode;
    public parent?: BSTNode;
    public color: Color = Color.RED;
}

export class TreeMap<K, V> extends Collection<K, V> implements MapInterface<K, V> {
    #size: number = 0;
    #values = new WeakMap<BSTNode, V>();
    #keys = new WeakMap<BSTNode, K>();
    #root?: BSTNode;

    /**
     * Creates an instance of TreeMap.
     * @param compareFn A function used to determine the order of the keys. It is expected to return
     * a negative value if first argument is less than second, zero if equal, and a positive value otherwise.
     * @param iterable An optional iterable (e.g., an Array of [key, value] pairs) to initialize the map.
     */
    constructor(private readonly compareFn: (a: K, b: K) => number, iterable?: Iterable<[K, V]>) {
        super()
        for (const [key, value] of iterable ?? [])
            this.set(key, value);
    }

    /**
     * Returns the number of key-value pairs in the map.
     */
    get size(): number {
        return this.#size;
    };

    /**
     * Associates the specified value with the specified key in this map.
     * If the map previously contained a mapping for the key, the old value is replaced.
     * * 
     * * @param key Key with which the specified value is to be associated.
     * @param value Value to be associated with the specified key.
     * @returns The TreeMap instance for method chaining.
     */
    public set(key: K, value: V): this {
        let y: BSTNode | undefined = undefined;
        let x = this.#root;
        let comparison = 0;

        while (x) {
            y = x;
            comparison = this.compareFn(key, this.#keys.get(x)!);
            if (comparison === 0) {
                this.#values.set(x, value);
                return this;
            }
            x = comparison < 0 ? x.left : x.right;
        }

        const z = new BSTNode();
        this.#keys.set(z, key);
        this.#values.set(z, value);
        z.parent = y;

        if (!y) {
            this.#root = z;
        } else if (this.compareFn(key, this.#keys.get(y)!) < 0) {
            y.left = z;
        } else {
            y.right = z;
        }

        z.color = Color.RED;
        this.#size++;
        this.#fixInsert(z);
        return this;
    }

    /**
     * Returns the value to which the specified key is mapped, 
     * or undefined if this map contains no mapping for the key.
     * @param key The key whose associated value is to be returned.
     * @returns The value associated with the key, or undefined.
     */
    public get(key: K): V | undefined {
        const node = this.#findNode(key);
        return node ? this.#values.get(node) : undefined;
    }

    /**
     * Returns true if this map contains a mapping for the specified key.
     * @param key The key whose presence in this map is to be tested.
     * @returns Boolean indicating if the key exists.
     */
    public has(key: K): boolean {
        return this.#findNode(key) !== undefined;
    }

    /**
     * Removes the mapping for a key from this map if it is present.
     * * 
     * * @param key Key whose mapping is to be removed from the map.
     * @returns True if the key was found and removed; false otherwise.
     */
    public delete(key: K): boolean {
        const z = this.#findNode(key);
        if (!z) return false;

        let y = z;
        let x: BSTNode | undefined;
        let yOriginalColor = y.color;

        if (!z.left) {
            x = z.right;
            this.#transplant(z, z.right);
        } else if (!z.right) {
            x = z.left;
            this.#transplant(z, z.left);
        } else {
            y = this.#minimum(z.right);
            yOriginalColor = y.color;
            x = y.right;
            if (y.parent === z) {
                if (x) x.parent = y;
            } else {
                this.#transplant(y, y.right);
                y.right = z.right;
                if (y.right) y.right.parent = y;
            }
            this.#transplant(z, y);
            y.left = z.left;
            if (y.left) y.left.parent = y;
            y.color = z.color;
        }

        this.#size--;
        if (yOriginalColor === Color.BLACK) {
            this.#fixDelete(x, x?.parent); // Passiamo il parent per gestire i nodi foglia nulli
        }
        return true;
    }

    /**
     * Removes all of the mappings from this map.
     */
    public clear(): void {
        this.#root = undefined;
        this.#size = 0;
    }

    #findNode(key: K): BSTNode | undefined {
        let current = this.#root;
        while (current) {
            const currentKey = this.#keys.get(current)!;
            const comparison = this.compareFn(key, currentKey);
            if (comparison === 0) return current;
            current = comparison < 0 ? current.left : current.right;
        }
        return undefined;
    }

    #minimum(node: BSTNode): BSTNode {
        while (node.left) node = node.left;
        return node;
    }

    #transplant(u: BSTNode, v?: BSTNode): void {
        if (!u.parent) this.#root = v;
        else if (u === u.parent.left) u.parent.left = v;
        else u.parent.right = v;
        if (v) v.parent = u.parent;
    }

    #rotateLeft(x: BSTNode): void {
        const y = x.right!;
        x.right = y.left;
        if (y.left) y.left.parent = x;
        y.parent = x.parent;
        if (!x.parent) this.#root = y;
        else if (x === x.parent.left) x.parent.left = y;
        else x.parent.right = y;
        y.left = x;
        x.parent = y;
    }

    #rotateRight(y: BSTNode): void {
        const x = y.left!;
        y.left = x.right;
        if (x.right) x.right.parent = y;
        x.parent = y.parent;
        if (!y.parent) this.#root = x;
        else if (y === y.parent.right) y.parent.right = x;
        else y.parent.left = x;
        x.right = y;
        y.parent = x;
    }

    #fixInsert(z: BSTNode): void {
        while (z.parent && z.parent.color === Color.RED) {
            if (z.parent === z.parent.parent?.left) {
                const uncle = z.parent.parent.right;
                if (uncle && uncle.color === Color.RED) {
                    z.parent.color = Color.BLACK;
                    uncle.color = Color.BLACK;
                    z.parent.parent.color = Color.RED;
                    z = z.parent.parent;
                } else {
                    if (z === z.parent.right) {
                        z = z.parent;
                        this.#rotateLeft(z);
                    }
                    z.parent!.color = Color.BLACK;
                    z.parent!.parent!.color = Color.RED;
                    this.#rotateRight(z.parent!.parent!);
                }
            } else {
                const uncle = z.parent.parent?.left;
                if (uncle && uncle.color === Color.RED) {
                    z.parent.color = Color.BLACK;
                    uncle.color = Color.BLACK;
                    z.parent.parent!.color = Color.RED;
                    z = z.parent.parent!;
                } else {
                    if (z === z.parent.left) {
                        z = z.parent;
                        this.#rotateRight(z);
                    }
                    z.parent!.color = Color.BLACK;
                    z.parent!.parent!.color = Color.RED;
                    this.#rotateLeft(z.parent!.parent!);
                }
            }
        }
        if (this.#root) this.#root.color = Color.BLACK;
    }

    #fixDelete(x: BSTNode | undefined, xParent: BSTNode | undefined): void {
        while (x !== this.#root && (!x || x.color === Color.BLACK)) {
            if (xParent && x === xParent.left) {
                let w = xParent.right;
                if (w?.color === Color.RED) {
                    w.color = Color.BLACK;
                    xParent.color = Color.RED;
                    this.#rotateLeft(xParent);
                    w = xParent.right;
                }
                if ((!w?.left || w.left.color === Color.BLACK) && (!w?.right || w.right.color === Color.BLACK)) {
                    if (w) w.color = Color.RED;
                    x = xParent;
                    xParent = x.parent;
                } else {
                    if (!w?.right || w.right.color === Color.BLACK) {
                        if (w?.left) w.left.color = Color.BLACK;
                        if (w) w.color = Color.RED;
                        if (w) this.#rotateRight(w);
                        w = xParent.right;
                    }
                    if (w) w.color = xParent.color;
                    xParent.color = Color.BLACK;
                    if (w?.right) w.right.color = Color.BLACK;
                    this.#rotateLeft(xParent);
                    x = this.#root;
                }
            } else if (xParent) {
                let w = xParent.left;
                if (w?.color === Color.RED) {
                    w.color = Color.BLACK;
                    xParent.color = Color.RED;
                    this.#rotateRight(xParent);
                    w = xParent.left;
                }
                if ((!w?.right || w.right.color === Color.BLACK) && (!w?.left || w.left.color === Color.BLACK)) {
                    if (w) w.color = Color.RED;
                    x = xParent;
                    xParent = x.parent;
                } else {
                    if (!w?.left || w.left.color === Color.BLACK) {
                        if (w?.right) w.right.color = Color.BLACK;
                        if (w) w.color = Color.RED;
                        if (w) this.#rotateLeft(w);
                        w = xParent.left;
                    }
                    if (w) w.color = xParent.color;
                    xParent.color = Color.BLACK;
                    if (w?.left) w.left.color = Color.BLACK;
                    this.#rotateRight(xParent);
                    x = this.#root;
                }
            } else break;
        }
        if (x) x.color = Color.BLACK;
    }


    /**
     * Performs the specified action for each entry in this map in sorted order.
     * @param callbackfn Function to execute for each entry.
     */
    public forEach(callbackfn: (value: V, key: K, obj: this) => void): void {
        for (const [key, value] of this.entries()) {
            callbackfn(value, key, this);
        }
    }

    /**
     * Returns a new TreeMap containing the results of calling a provided function on 
     * every value in the calling map.
     * @param callbackfn Function that produces an element of the new TreeMap.
     * @returns A new TreeMap with transformed values.
     */
    public map<U>(callbackfn: (value: V, key: K, obj: this) => U): TreeMap<K, U> {
        const result = new TreeMap<K, U>(this.compareFn);
        for (const [key, value] of this.entries()) {
            result.set(key, callbackfn(value, key, this));
        }
        return result;
    }

    /**
     * Reduces the map entries to a single value using a callback function.
     * @param callbackfn Function to execute on each element.
     * @param initialValue Value to use as the first argument to the first call of the callback.
     * @returns The reduced value.
     */
    public reduce<U>(callbackfn: (prev: U, val: V, key: K, obj: this) => U, initialValue: U): U {
        let acc = initialValue;
        for (const [key, value] of this.entries()) {
            acc = callbackfn(acc, value, key, this);
        }
        return acc;
    }

    /**
     * Tests whether all entries in the map pass the test implemented by the provided function.
     * @param predicate Function to test each entry.
     * @returns True if all entries pass the predicate, false otherwise.
     */
    public every(predicate: (value: V, key: K, obj: this) => unknown): boolean {
        for (const [key, value] of this.entries()) {
            if (!predicate(value, key, this)) return false;
        }
        return true;
    }

    /**
     * Tests whether at least one entry in the map passes the test implemented by the provided function.
     * @param predicate Function to test each entry.
     * @returns True if at least one entry passes the predicate, false otherwise.
     */
    public some(predicate: (value: V, key: K, obj: this) => unknown): boolean {
        for (const [key, value] of this.entries()) {
            if (predicate(value, key, this)) return true;
        }
        return false;
    }

    /**
     * Returns a new TreeMap containing all entries that pass the test implemented by the provided function.
     * @param predicate Function to test each entry.
     * @returns A new TreeMap containing only the filtered entries.
     */
    public filter<S extends V>(predicate: (value: V, key: K, obj: this) => boolean | undefined | null): TreeMap<K, S> {
        const result = new TreeMap<K, S>(this.compareFn);
        for (const [key, value] of this.entries()) {
            if (predicate(value, key, this)) result.set(key, value as S);
        }
        return result;
    }

    /**
     * Returns the value of the first entry in the map that satisfies the provided testing function.
     * @param predicate Function to execute on each element.
     * @returns The value of the first entry that passes the test, or undefined.
     */
    public find<S extends V>(predicate: (value: V, key: K, obj: this) => boolean | undefined | null): S | undefined {
        for (const [key, value] of this.entries()) {
            if (predicate(value, key, this)) return value as S;
        }
        return undefined;
    }

    public pipe(): Pipeline<[K, V], 'sync'>
    public pipe<U>(transformer: (source: Pipeline<[K, V], 'sync'>) => Pipeline<[K, U], 'sync'>): TreeMap<K, U>
    public pipe<U>(transformer?: (source: Pipeline<[K, V], 'sync'>) => Pipeline<[K, U], 'sync'>): TreeMap<K, U> | Pipeline<[K, V], 'sync'> {
        const pipeline = new SyncPipelineConstructor(this.entries())
        if (!transformer)
            return pipeline;
        return new TreeMap(this.compareFn, transformer(pipeline).sink());
    }

    /**
     * Returns a new Iterator object that contains the keys for each element in the map in sorted order.
     */
    public *keys(): IterableIterator<K> {
        for (const [key] of this.entries()) yield key;
    }

    /**
     * Returns a new Iterator object that contains the values for each element in the map in sorted order of their keys.
     */
    public *values(): IterableIterator<V> {
        for (const [, value] of this.entries()) yield value;
    }

    /**
     * Returns a new Iterator object that contains the [key, value] pairs for each element in the map in sorted order.
     */
    public *entries(): IterableIterator<[K, V]> {
        const stack = new LinkedList<BSTNode>();
        let current = this.#root;

        while (stack.length > 0 || current) {
            while (current) {
                stack.push(current);
                current = current.left;
            }

            // Elabora il nodo
            current = stack.pop()!;
            yield [this.#keys.get(current)!, this.#values.get(current)!];

            current = current.right;
        }
    }

    /**
     * Default iterator for the TreeMap, yielding [key, value] pairs in sorted order.
     */
    [Symbol.iterator](): IterableIterator<[K, V]> {
        return this.entries();
    }

    toJSON(): [K, V][] {
        const array = new Array<[K, V]>(this.#size);
        let i = 0;
        for (const entry of this)
            array[i++] = entry;
        return array;
    }

    /**
     * Tag used by Object.prototype.toString.
     */
    get [Symbol.toStringTag](): string { return "TreeMap" };

    public static from<R, S>(iterable: Iterable<[R, S]>): TreeMap<R, S> {
        return new TreeMap((a, b) => a == b ? 0 : a < b ? -1 : 1, iterable);
    }
}