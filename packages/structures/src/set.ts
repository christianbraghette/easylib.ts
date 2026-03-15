import { Collection, type Set as SetInterface } from "./collections";
import { ArrayList, LinkedList } from "./list";
import { Pipeline, SyncPipelineConstructor } from "./pipeline";

export class HashSet<T> extends Collection<T, T> implements SetInterface<T> {
    #set: Set<T>;

    /**
     * Creates a new HashSet.
     * @param iterable An optional iterable of elements to initialize the set with.
     */
    constructor(iterable?: Iterable<T>) {
        super();
        this.#set = new Set(iterable);
    }

    /**
     * Adds a new value to the set.
     * @param value The value to add.
     * @returns The HashSet instance for method chaining.
     */
    public add(value: T): this {
        this.#set.add(value);
        return this;
    }

    /**
     * Gets the number of elements in the set.
     */
    public get size(): number {
        return this.#set.size;
    }

    /**
     * Checks if a value exists in the set.
     * @param key The value to search for.
     * @returns True if the value exists, false otherwise.
     */
    public has(key: T): boolean {
        return this.#set.has(key);
    }

    /**
     * Removes a value from the set.
     * @param key The value to remove.
     * @returns True if the element was successfully removed, false if it didn't exist.
     */
    public delete(key: T): boolean {
        return this.#set.delete(key);
    }

    /**
     * Removes all elements from the set.
     */
    public clear(): void {
        this.#set.clear();
    }

    /**
     * Executes a provided function once for each element in the set.
     * @param callbackfn Function to execute for each element.
     */
    public forEach(callbackfn: (value: T, key: T, obj: HashSet<T>) => void): void {
        for (const value of this.#set) {
            callbackfn(value, value, this);
        }
    }

    /**
     * Creates a new HashSet with the results of calling a provided function on every element.
     * @param callbackfn Function that produces an element of the new HashSet.
     * @returns A new HashSet containing the transformed elements.
     */
    public map<U>(callbackfn: (value: T, key: T, obj: this) => U): HashSet<U> {
        const result = new HashSet<U>();
        for (const value of this.#set) {
            result.add(callbackfn(value, value, this));
        }
        return result;
    }

    /**
     * Executes a reducer function on each element, resulting in a single output value.
     * @param callbackfn Function to execute on each element.
     * @param initialValue Value to use as the first argument to the first call of the callback.
     * @returns The value resulting from the reduction.
     */
    public reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentKey: T, obj: HashSet<T>) => U, initialValue: U): U {
        let accumulator = initialValue;
        for (const value of this.#set) {
            accumulator = callbackfn(accumulator, value, value, this);
        }
        return accumulator;
    }

    /**
     * Tests whether all elements in the set pass the test implemented by the provided function.
     * @param predicate Function to test each element.
     * @returns True if every element passes the predicate, false otherwise.
     */
    public every(predicate: (value: T, key: T, obj: HashSet<T>) => boolean | undefined | null): boolean {
        for (const value of this.#set) {
            if (!predicate(value, value, this)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Tests whether at least one element in the set passes the test implemented by the provided function.
     * @param predicate Function to test each element.
     * @returns True if at least one element passes the predicate, false otherwise.
     */
    public some(predicate: (value: T, key: T, obj: HashSet<T>) => boolean | undefined | null): boolean {
        for (const value of this.#set) {
            if (predicate(value, value, this)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Creates a new HashSet with all elements that pass the test implemented by the provided function.
     * @param predicate Function to test each element.
     * @returns A new HashSet with the elements that passed the test.
     */
    public filter<S extends T>(predicate: (value: T, key: T, obj: HashSet<T>) => boolean | undefined | null): HashSet<S> {
        const result = new HashSet<S>();
        for (const value of this.#set) {
            if (predicate(value, value, this)) {
                result.add(value as S);
            }
        }
        return result;
    }

    /**
     * Returns the value of the first element in the set that satisfies the provided testing function.
     * @param predicate Function to execute on each value.
     * @returns The first element that matches the predicate, or undefined if none match.
     */
    public find<S extends T>(predicate: (value: T, key: T, obj: HashSet<T>) => boolean | undefined | null): S | undefined {
        for (const value of this.#set) {
            if (predicate(value, value, this)) {
                return value as S;
            }
        }
        return undefined;
    }

    public pipe(): Pipeline<T, 'sync'>
    public pipe<U>(transformer: (source: Pipeline<T, 'sync'>) => Pipeline<U, 'sync'>): HashSet<U>
    public pipe<U>(transformer?: (source: Pipeline<T, 'sync'>) => Pipeline<U, 'sync'>): HashSet<U> | Pipeline<T, 'sync'> {
        const pipeline = new SyncPipelineConstructor(this.values())
        if (!transformer)
            return pipeline;
        return new HashSet(transformer(pipeline).sink());
    }

    public sort(compareFn: (a: T, b: T) => number): this {
        const entries = new ArrayList(this.#set.values());

        entries.sort(compareFn);

        this.#set.clear();

        for (const value of entries) {
            this.#set.add(value);
        }

        return this;
    }

    /**
     * Combines the current set with another iterable to create a new set containing all unique elements from both.
     * @param other An iterable of elements to join with.
     * @returns A new HashSet containing the union.
     */
    public union(other: SetInterface<T>): HashSet<T> {
        const result = new HashSet<T>(this);
        for (const item of other) result.add(item);
        return result;
    }

    /**
     * Creates a new set containing only the elements present in both the current set and the provided set.
     * @param other The HashSet to intersect with.
     * @returns A new HashSet containing the intersection.
     */
    public intersection(other: SetInterface<T>): HashSet<T> {
        const result = new HashSet<T>();
        for (const item of this)
            if (other.has(item)) result.add(item);
        return result;
    }

    /**
     * Creates a new set containing elements that are in the current set but not in the provided set.
     * @param other The HashSet to compare against.
     * @returns A new HashSet containing the difference.
     */
    public difference(other: SetInterface<T>): HashSet<T> {
        const result = new HashSet<T>();
        for (const item of this)
            if (!other.has(item)) result.add(item);
        return result;
    }

    /**
     * Determines whether the current set is a subset of another set.
     * @param other The potential superset.
     * @returns True if all elements of the current set are in the other set.
     */
    public isSubsetOf(other: SetInterface<T>): boolean {
        if (this.size > other.size) return false;
        return this.every(value => other.has(value));
    }

    /**
     * Returns an iterable of values in the set.
     */
    public keys(): IterableIterator<T> {
        return this.#set.keys();
    }

    /**
     * Returns an iterable of values in the set.
     */
    public values(): IterableIterator<T> {
        return this.#set.values();
    }

    /**
     * Returns an iterable of [value, value] pairs for every element in the set.
     */
    public entries(): IterableIterator<[T, T]> {
        return this.#set.entries();
    }

    /**
     * Default iterator for the HashSet.
     */
    [Symbol.iterator](): IterableIterator<T> {
        return this.#set.values();
    }

    toJSON(): T[] {
        const array = new Array(this.#set.size);
        let i = 0;
        for (const entry of this)
            array[i++] = entry;
        return array;
    }

    get [Symbol.toStringTag](): string { return "HashSet"; }

    public static from<S>(iterable: Iterable<S>): HashSet<S> {
        return new HashSet(iterable);
    }
}

enum Color {
    RED,
    BLACK
}

class BSTNode {
    public left?: BSTNode;
    public right?: BSTNode;
    public parent?: BSTNode;
    public color: Color = Color.RED;
}

export class TreeSet<T> extends Collection<T, T> implements SetInterface<T> {
    #size: number = 0;
    #data = new WeakMap<BSTNode, T>();
    #root?: BSTNode;

    /**
     * Creates a new TreeSet.
     * @param compareFn A function used to determine the order of the elements. 
     * It should return -1 if a < b, 1 if a > b, and 0 if they are equal.
     * @param iterable An optional iterable of elements to initialize the set with.
     */
    constructor(private readonly compareFn: (a: T, b: T) => number, iterable?: Iterable<T>) {
        super();
        for (const data of iterable ?? [])
            this.add(data);
    }

    /**
     * Gets the number of elements in the set.
     */
    public get size(): number {
        return this.#size;
    }

    /**
     * Adds a new value to the set while maintaining sorted order.
     * If the value is already present, the set remains unchanged.
     * @param value The value to add.
     * @returns The TreeSet instance for method chaining.
     */
    public add(value: T): this {
        let y: BSTNode | undefined = undefined;
        let x = this.#root;

        while (x) {
            y = x;
            const comparison = this.compareFn(value, this.#data.get(x)!);
            if (comparison === 0) return this; // Value already exists
            x = comparison < 0 ? x.left : x.right;
        }

        const z = new BSTNode();
        this.#data.set(z, value);
        z.parent = y;

        if (!y) {
            this.#root = z;
        } else if (this.compareFn(value, this.#data.get(y)!) < 0) {
            y.left = z;
        } else {
            y.right = z;
        }

        this.#size++;
        this.#fixInsert(z);
        return this;
    }

    /**
     * Checks if a value exists in the set using the comparison function.
     * @param value The value to search for.
     * @returns True if the value exists, false otherwise.
     */
    public has(value: T): boolean {
        let current = this.#root;
        while (current) {
            const currentVal = this.#data.get(current)!;
            const comparison = this.compareFn(value, currentVal);
            if (comparison === 0) return true;
            current = comparison < 0 ? current.left : current.right;
        }
        return false;
    }

    /**
     * Removes a value from the set and rebalances the tree structure.
     * @param value The value to remove.
     * @returns True if the element was successfully removed, false if it didn't exist.
     */
    public delete(value: T): boolean {
        const z = this.#findNode(value);
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
            this.#fixDelete(x, x?.parent);
        }
        return true;
    }

    /**
     * Removes all elements from the set.
     */
    public clear(): void {
        this.#root = undefined;
        this.#size = 0;
    }

    #findNode(value: T): BSTNode | undefined {
        let current = this.#root;
        while (current) {
            const comparison = this.compareFn(value, this.#data.get(current)!);
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
     * Executes a provided function once for each element in sorted order.
     * @param callbackfn Function to execute for each element.
     */
    public forEach(callbackfn: (value: T, key: T, obj: this) => void): void {
        for (const value of this.values()) {
            callbackfn(value, value, this);
        }
    }

    /**
     * Creates a new TreeSet with the results of calling a provided function on every element.
     * @param callbackfn Function that produces an element of the new set.
     * @param newCompareFn The comparison function for the new type U.
     * @returns A new TreeSet containing the transformed elements.
     */
    public map<U>(callbackfn: (value: T, key: T, obj: this) => U, newCompareFn?: (a: U, b: U) => -1 | 0 | 1): TreeSet<U> {
        if (!newCompareFn) throw new Error("map on TreeSet requires a newCompareFn for the target type.");
        const result = new TreeSet<U>(newCompareFn);
        for (const value of this.values()) {
            result.add(callbackfn(value, value, this));
        }
        return result;
    }

    /**
     * Executes a reducer function on each element in sorted order, resulting in a single output value.
     * @param callbackfn Function to execute on each element.
     * @param initialValue Value to use as the accumulator in the first call.
     * @returns The value resulting from the reduction.
     */
    public reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentKey: T, obj: this) => U, initialValue: U): U {
        let accumulator = initialValue;
        for (const value of this.values()) {
            accumulator = callbackfn(accumulator, value, value, this);
        }
        return accumulator;
    }

    /**
     * Tests whether all elements pass the test implemented by the provided function.
     * @param predicate Function to test each element.
     * @returns True if every element passes the predicate.
     */
    public every(predicate: (value: T, key: T, obj: this) => boolean | undefined | null): boolean {
        for (const value of this.values()) {
            if (!predicate(value, value, this)) return false;
        }
        return true;
    }

    /**
     * Tests whether at least one element passes the test implemented by the provided function.
     * @param predicate Function to test each element.
     * @returns True if any element passes the predicate.
     */
    public some(predicate: (value: T, key: T, obj: this) => boolean | undefined | null): boolean {
        for (const value of this.values()) {
            if (predicate(value, value, this)) return true;
        }
        return false;
    }

    /**
     * Creates a new TreeSet with all elements that pass the test implemented by the provided function.
     * @param predicate Function to test each element.
     * @returns A new TreeSet with filtered elements.
     */
    public filter<S extends T>(predicate: (value: T, key: T, obj: this) => boolean | undefined | null): TreeSet<S> {
        const result = new TreeSet<S>(this.compareFn as any);
        for (const value of this.values()) {
            if (predicate(value, value, this)) result.add(value as S);
        }
        return result;
    }

    /**
     * Returns the first element that satisfies the provided testing function.
     * Since the set is sorted, this will be the "smallest" matching element.
     * @param predicate Function to execute on each value.
     * @returns The first element that matches the predicate, or undefined.
     */
    public find<S extends T>(predicate: (value: T, key: T, obj: this) => boolean | undefined | null): S | undefined {
        for (const value of this.values()) {
            if (predicate(value, value, this)) return value as S;
        }
        return undefined;
    }

    public pipe(): Pipeline<T, 'sync'>
    public pipe<U>(transformer: (source: Pipeline<T, 'sync'>) => Pipeline<U, 'sync'>, compareFn?: (a: U, b: U) => number): TreeSet<U>
    public pipe<U>(transformer?: (source: Pipeline<T, 'sync'>) => Pipeline<U, 'sync'>, compareFn?: (a: U, b: U) => number): TreeSet<U> | Pipeline<T, 'sync'> {
        const pipeline = new SyncPipelineConstructor(this.values())
        if (!transformer)
            return pipeline;
        return new TreeSet(compareFn ?? ((a, b) => a == b ? 0 : a < b ? -1 : 1), transformer(pipeline).sink());
    }

    /**
     * Combines the current set with another iterable to create a new sorted set.
     */
    public union(other: Iterable<T>): TreeSet<T> {
        const result = new TreeSet<T>(this.compareFn, this.values());
        for (const item of other) result.add(item);
        return result;
    }

    /**
     * Creates a new set containing elements present in both this set and the provided set.
     */
    public intersection(other: SetInterface<T>): TreeSet<T> {
        const result = new TreeSet<T>(this.compareFn);
        for (const item of this.values()) {
            if (other.has(item)) result.add(item);
        }
        return result;
    }

    /**
     * Creates a new set containing elements present in this set but not in the other.
     */
    public difference(other: SetInterface<T>): TreeSet<T> {
        const result = new TreeSet<T>(this.compareFn);
        for (const item of this.values()) {
            if (!other.has(item)) result.add(item);
        }
        return result;
    }

    /**
     * Determines whether all elements of this set are present in the other set.
     */
    public isSubsetOf(other: SetInterface<T>): boolean {
        if (this.size > other.size) return false;
        for (const value of this.values()) {
            if (!other.has(value)) return false;
        }
        return true;
    }

    /**
     * Returns an iterable of values in sorted order.
     */
    public keys(): IterableIterator<T> {
        return this.values();
    }

    /**
     * Returns an iterable of values in sorted order using in-order traversal.
     */
    public *values(): IterableIterator<T> {
        const stack = new LinkedList<BSTNode>();
        let current = this.#root;
        while (stack.length > 0 || current) {
            while (current) {
                stack.push(current);
                current = current.left;
            }
            current = stack.pop()!;
            yield this.#data.get(current)!;
            current = current.right;
        }
    }

    /**
     * Returns an iterable of [value, value] pairs in sorted order.
     */
    public *entries(): IterableIterator<[T, T]> {
        for (const value of this.values()) yield [value, value];
    }

    /**
     * Default iterator that returns values in sorted order.
     */
    [Symbol.iterator](): IterableIterator<T> {
        return this.values();
    }

    toJSON(): T[] {
        const array = new Array(this.#size);
        let i = 0;
        for (const entry of this)
            array[i++] = entry;
        return array;
    }

    get [Symbol.toStringTag](): string { return "TreeSet"; }

    public static from<S>(iterable: Iterable<S>): TreeSet<S> {
        return new TreeSet((a, b) => a == b ? 0 : a < b ? -1 : 1, iterable);
    }
}