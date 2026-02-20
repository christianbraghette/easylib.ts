import { Indexable, Deque, FIFO, RFIFO, IndexableFunctionals, Linear } from "./interfaces";

/**
 * Interface for the Lists.
 * Extends IterableIterator to support for...of loops and manual iteration.
 */
interface ListIterator<T> extends IterableIterator<T> { };

export interface List<T> extends FIFO<T>, RFIFO<T>, Indexable<T>, IndexableFunctionals<number, T> {
    toString(): string;
    toLocaleString(): string;

    keys(): ListIterator<number>;
    values(): ListIterator<T>;
    entries(): ListIterator<[number, T]>;

    [Symbol.iterator](): ListIterator<T>;
}

export function isList(obj: any) {
    return obj instanceof ArrayList || obj instanceof LinkedList;
}

export class ArrayList<T> implements List<T> {
    readonly [n: number]: T;
    readonly #items: T[];

    constructor()
    constructor(length?: number)
    constructor(iterable?: Iterable<T>)
    constructor(args?: Iterable<T> | number) {
        if (args !== undefined)
            if (typeof args === 'number')
                this.#items = new Array(args);
            else
                this.#items = new Array(...args);
        else
            this.#items = new Array();

        return new Proxy(this, {
            get: (target, prop) => {
                if (typeof prop === 'string' && /^\d+$/.test(prop)) {
                    return target.at(Number(prop));
                }
                return Reflect.get(target, prop);
            }/*,
            set: (target, prop, value) => {
                if (typeof prop === 'string' && /^\d+$/.test(prop)) {
                    const node = (target as any).getNodeAt(Number(prop));
                    if (node) {
                        node.value = value;
                        return true;
                    }
                    return false;
                }
                return Reflect.set(target, prop, value);
            }*/
        })
    }

    get length(): number {
        return this.#items.length;
    };

    toString(): string {
        throw new Error("Method not implemented.");
    }
    toLocaleString(): string {
        throw new Error("Method not implemented.");
    }
    keys(): ListIterator<number> {
        throw new Error("Method not implemented.");
    }
    values(): ListIterator<T> {
        throw new Error("Method not implemented.");
    }
    entries(): ListIterator<[number, T]> {
        throw new Error("Method not implemented.");
    }
    [Symbol.iterator](): ListIterator<T> {
        throw new Error("Method not implemented.");
    }
    pop(): T | undefined {
        throw new Error("Method not implemented.");
    }
    push(...items: T[]): number {
        throw new Error("Method not implemented.");
    }
    shift(): T | undefined {
        throw new Error("Method not implemented.");
    }
    unshift(...items: T[]): number {
        throw new Error("Method not implemented.");
    }
    at(index: number): T | undefined {
        throw new Error("Method not implemented.");
    }
    fill(value: T, start?: number, end?: number): this {
        throw new Error("Method not implemented.");
    }
    includes(searchElement: T, fromIndex?: number): boolean {
        throw new Error("Method not implemented.");
    }
    indexOf(searchElement: T, fromIndex?: number): number {
        throw new Error("Method not implemented.");
    }
    lastIndexOf(searchElement: T, fromIndex?: number): number {
        throw new Error("Method not implemented.");
    }
    slice(start?: number, end?: number): Indexable<T> {
        throw new Error("Method not implemented.");
    }
    splice(start: number, deleteCount?: number, ...items: T[]): Indexable<T> {
        throw new Error("Method not implemented.");
    }
    copyWithin(target: number, start: number, end?: number): this {
        throw new Error("Method not implemented.");
    }
    reverse(): this {
        throw new Error("Method not implemented.");
    }
    concat(...items: (T | ConcatArray<T>)[]): Linear<T> {
        throw new Error("Method not implemented.");
    }
    join(separator?: string): string {
        throw new Error("Method not implemented.");
    }
    findIndex(predicate: (value: T, index: number, obj: ArrayList<T>) => unknown): number {
        throw new Error("Method not implemented.");
    }
    findLastIndex(predicate: (value: T, index: number, obj: ArrayList<T>) => unknown): number {
        throw new Error("Method not implemented.");
    }
    findLast<S extends T>(predicate: (value: T, index: number, obj: ArrayList<T>) => value is S): S | undefined {
        throw new Error("Method not implemented.");
    }
    reduceRight<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, obj: ArrayList<T>) => U, initialValue: U): U {
        throw new Error("Method not implemented.");
    }
    flat(depth?: number): ArrayList<T> {
        throw new Error("Method not implemented.");
    }
    flatMap<U>(callbackfn: (value: T, index: number, obj: ArrayList<T>) => U | U[]): ArrayList<U> {
        throw new Error("Method not implemented.");
    }
    sort(compareFn?: ((a: T, b: T) => number) | undefined): this {
        throw new Error("Method not implemented.");
    }
    forEach(callbackfn: (value: T, key: number, obj: ArrayList<T>) => void): void {
        throw new Error("Method not implemented.");
    }
    map<U>(callbackfn: (value: T, key: number, obj: ArrayList<T>) => U): ArrayList<U> {
        throw new Error("Method not implemented.");
    }
    reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentKey: number, obj: ArrayList<T>) => U, initialValue: U): U {
        throw new Error("Method not implemented.");
    }
    every(predicate: (value: T, key: number, obj: ArrayList<T>) => unknown): boolean {
        throw new Error("Method not implemented.");
    }
    some(predicate: (value: T, key: number, obj: ArrayList<T>) => unknown): boolean {
        throw new Error("Method not implemented.");
    }
    filter<S extends T>(predicate: (value: T, key: number, obj: ArrayList<T>) => value is S): ArrayList<S> {
        throw new Error("Method not implemented.");
    }
    find<S extends T>(predicate: (value: T, key: number, obj: ArrayList<T>) => value is S): S | undefined {
        throw new Error("Method not implemented.");
    }

    public get [Symbol.toStringTag]() { return 'ArrayList'; }
}

/*export class ArrayList<T> extends Array<T> implements ArrayList<T> {
    [index: number]: T;
    declare readonly length: number;

    constructor()
    constructor(length?: number)
    constructor(iterable?: Iterable<T>)
    constructor(args?: Iterable<T> | number) {
        if (args !== undefined)
            if (typeof args === 'number')
                super(args);
            else
                super(...args);
        else
            super();
    }

    public concat(...items: (T | ConcatArray<T>)[]): ArrayList<T> {
        return new ArrayList(super.concat(...items));
    }

    public slice(start?: number, end?: number): ArrayList<T> {
        return new ArrayList(super.slice(start, end));
    }

    public splice(start: number, deleteCount?: number, ...items: T[]): ArrayList<T>;
    public splice(start: number, deleteCount?: number, ...items: T[]): T[];
    public splice(start: number, deleteCount: number = 0, ...items: T[]): any {
        return new ArrayList(super.splice(start, deleteCount, ...items));
    }

    public map<U>(callbackfn: (value: T, index: number, array: ArrayList<T>) => U): ArrayList<U>;
    public map<U>(callbackfn: (value: T, index: number, array: T[]) => U): U[];
    public map(callbackfn: any): any {
        return new ArrayList(super.map((value, index) => callbackfn(value, index, this)));
    }

    public filter<S extends T>(predicate: (value: T, index: number, array: ArrayList<T>) => value is S): ArrayList<S>;
    public filter(predicate: (value: T, index: number, array: T[]) => unknown): T[];
    public filter(predicate: any): any {
        return new ArrayList(super.filter((value, index) => predicate(value, index, this)));
    }

    public flat(depth?: number): ArrayList<T> {
        return new ArrayList(super.flat(depth) as T[]);
    }

    public flatMap<U>(callbackfn: (value: T, index: number, array: ArrayList<T>) => U | Array<U>): ArrayList<U> {
        return new ArrayList(super.flatMap((value, index) => callbackfn(value, index, this)));
    }

    public at(index: number): T | undefined {
        index = index < 0 ? this.length + index : index;
        return this[index];
    }

    public findLast<S extends T>(predicate: (value: T, index: number, array: ArrayList<T>) => value is S): S | undefined {
        for (let i = this.length - 1; i >= 0; i--)
            if (predicate(this[i], i, this))
                return this[i] as S;
        return undefined;
    }

    public findLastIndex(predicate: (value: T, index: number, array: ArrayList<T>) => unknown): number {
        for (let i = this.length - 1; i >= 0; i--)
            if (predicate(this[i], i, this))
                return i;
        return -1;
    }

    public static from<U>(iterable: Iterable<U> | ArrayLike<U>): ArrayList<U> {
        return new ArrayList<U>(Array.from(iterable));
    }

    public get [Symbol.toStringTag]() {
        return 'ArrayList';
    }
}*/

class DoublyNode<T> {
    constructor(
        public value: T,
        public next: DoublyNode<T> | null = null,
        public prev: DoublyNode<T> | null = null
    ) { }
}

/**
 * A Doubly Linked List that implements standard Array-like functional methods.
 * Supports O(1) logical reversal via an internal flag and indexed access via Proxy.
 * @template T The type of elements held in the list.
 */
export class LinkedList<T> implements List<T>, Deque<T> {

    #head: DoublyNode<T> | null = null;
    #tail: DoublyNode<T> | null = null;
    #size = 0;
    #reverse = false;

    /**
     * Creates a new LinkedList.
     * @param iterable An optional iterable (e.g., Array) to initialize the list with.
     */
    constructor(iterable?: Iterable<T>) {
        if (iterable) {
            this.push(...iterable);
        };
    }

    private getNext(node: DoublyNode<T>): DoublyNode<T> | null { return this.#reverse ? node.prev : node.next; }
    private getPrev(node: DoublyNode<T>): DoublyNode<T> | null { return this.#reverse ? node.next : node.prev; }

    private setNext(node: DoublyNode<T>, value: DoublyNode<T> | null): void {
        if (this.#reverse) node.prev = value; else node.next = value;
    }
    private setPrev(node: DoublyNode<T>, value: DoublyNode<T> | null): void {
        if (this.#reverse) node.next = value; else node.prev = value;
    }

    /**
     * Retrieves the node at a specific index.
     * Optimized to start scanning from the head or tail based on proximity.
     * @param index Zero-based index.
     * @returns The node or null if not found.
     * @timeComplexity O(n/2)
     */
    private getNodeAt(index: number): DoublyNode<T> | null {
        if (index < 0 || index >= this.#size) return null;
        let current: DoublyNode<T> | null;
        if (index < this.#size / 2) {
            current = this.#head;
            for (let i = 0; i < index; i++) current = this.getNext(current!);
        } else {
            current = this.#tail;
            for (let i = this.#size - 1; i > index; i--) current = this.getPrev(current!);
        }
        return current;
    }

    private normalizeRange(start: number, end?: number) {
        let startIndex = start < 0 ? Math.max(this.#size + start, 0) : Math.min(start, this.#size);
        let endIndex = end === undefined ? this.#size : (end < 0 ? Math.max(this.#size + end, 0) : Math.min(end, this.#size));
        return { startIndex, endIndex };
    }

    // --- MUTATION METHODS ---

    /**
     * Appends new elements to the end of the list.
     * @param items Elements to add.
     * @returns The new length of the list.
     * @timeComplexity O(1) per element.
     */
    public push(...items: T[]): number {
        for (const item of items) {
            const newNode = new DoublyNode(item);
            if (!this.#head) {
                this.#head = this.#tail = newNode;
            } else {
                this.setNext(this.#tail!, newNode);
                this.setPrev(newNode, this.#tail);
                this.#tail = newNode;
            }
            this.#size++;
        }
        return this.#size;
    }

    /**
     * Removes and returns the last element of the list.
     * @returns The removed element or undefined if the list is empty.
     * @timeComplexity O(1)
     */
    public pop(): T | undefined {
        if (!this.#tail) return undefined;
        const val = this.#tail.value;
        const nodeToRemove = this.#tail;
        const newTail = this.getPrev(nodeToRemove);

        if (newTail) {
            this.setNext(newTail, null);
            this.#tail = newTail;
        } else {
            this.#head = this.#tail = null;
        }

        nodeToRemove.prev = nodeToRemove.next = null;
        this.#size--;
        return val;
    }

    /**
     * Adds new elements to the beginning of the list.
     * @param items Elements to add.
     * @returns The new length of the list.
     * @timeComplexity O(1) per element.
     */
    public unshift(...items: T[]): number {
        for (let i = items.length - 1; i >= 0; i--) {
            const newNode = new DoublyNode(items[i]);
            if (!this.#head) {
                this.#head = this.#tail = newNode;
            } else {
                this.setNext(newNode, this.#head);
                this.setPrev(this.#head, newNode);
                this.#head = newNode;
            }
            this.#size++;
        }
        return this.#size;
    }

    /**
     * Removes and returns the first element of the list.
     * @returns The removed element or undefined if the list is empty.
     * @timeComplexity O(1)
     */
    public shift(): T | undefined {
        if (!this.#head)
            return undefined;
        const value = this.#head.value;
        this.#head = this.getNext(this.#head);
        if (this.#head)
            this.setPrev(this.#head, null);
        else
            this.#tail = null;
        this.#size--;
        return value;
    }

    public first(): T | undefined {
        return this.#head?.value;
    }

    public last(): T | undefined {
        return this.#tail?.value;
    }

    // --- FUNCTIONAL METHODS ---

    /**
     * Executes a provided function once for each list element.
     * @param callback Function to execute for each element: (value, index, list).
     */
    public forEach(callback: (value: T, index: number, list: LinkedList<T>) => void): void {
        let index = 0;
        let current = this.#head;
        while (current) {
            callback(current.value, index++, this);
            current = this.getNext(current);
        }
    }

    /**
     * Creates a new list with the results of calling a function on every element.
     * @template U The type of elements in the new list.
     * @param callback Transformation function.
     * @returns A new LinkedList with transformed values.
     */
    public map<U>(callback: (value: T, index: number, list: LinkedList<T>) => U): LinkedList<U> {
        const result = new LinkedList<U>();
        let index = 0;
        let current = this.#head;
        while (current) {
            result.push(callback(current.value, index++, this));
            current = this.getNext(current);
        }
        return result;
    }

    /**
     * Returns a new list with all sub-array/list elements concatenated into it.
     * @param depth The maximum recursion depth (default 1).
     */
    public flat(depth: number = 1): LinkedList<T> {
        const result = new LinkedList<T>();

        const flatten = (items: Iterable<T>, currentDepth: number) => {
            for (const item of items) {
                if (currentDepth > 0 && (Array.isArray(item) || item instanceof LinkedList)) {
                    flatten(item, currentDepth - 1);
                } else {
                    result.push(item);
                }
            }
        };

        flatten(this, depth);
        return result;
    }

    /**
     * Returns a new list by first applying a projection function to each element,
     * and then flattening the result.
     */
    public flatMap<U>(callback: (value: T, index: number, list: LinkedList<T>) => U | Array<U>): LinkedList<U> {
        const result = new LinkedList<U>();
        let current = this.#head;
        let index = 0;
        while (current) {
            const transformed = callback(current.value, index++, this);
            if (transformed instanceof LinkedList) {
                for (const item of transformed)
                    result.push(item as U);
            } else {
                result.push(transformed as U);
            }
            current = this.getNext(current);
        }
        return result;
    }

    /**
     * Creates a new list with all elements that pass the test implemented by the provided function.
     * @param predicate Function to test each element.
     * @returns A new LinkedList with elements that passed the test.
     */
    public filter<S extends T>(predicate: (value: T, index: number, list: LinkedList<T>) => value is S): LinkedList<S> {
        const result = new LinkedList<S>();
        let current = this.#head;
        let index = 0;
        while (current) {
            if (predicate(current.value, index++, this))
                result.push(current.value);
            current = this.getNext(current);
        }
        return result;
    }

    /**
     * Applies a function against an accumulator and each element to reduce it to a single value.
     */
    public reduce<U>(callback: (acc: U, value: T, index: number, list: LinkedList<T>) => U, initialValue: U): U {
        let accumulator = initialValue;
        this.forEach((val, i) => {
            accumulator = callback(accumulator, val, i, this);
        });
        return accumulator;
    }

    /**
     * Returns the first element that satisfies the provided testing function.
     */
    public find<S extends T>(predicate: (value: T, index: number, list: LinkedList<T>) => value is S): S | undefined {
        let current = this.#head;
        let index = 0;
        while (current) {
            if (predicate(current.value, index, this)) return current.value;
            current = this.getNext(current);
            index++;
        }
        return undefined;
    }

    /**
     * Tests whether at least one element passes the test.
     */
    public some(predicate: (value: T, index: number, list: LinkedList<T>) => boolean): boolean {
        let current = this.#head;
        let index = 0;
        while (current) {
            if (predicate(current.value, index, this)) return true;
            current = this.getNext(current);
            index++;
        }
        return false;
    }

    /**
     * Tests whether all elements pass the test.
     */
    public every(predicate: (value: T, index: number, list: LinkedList<T>) => boolean): boolean {
        let current = this.#head;
        let index = 0;
        while (current) {
            if (!predicate(current.value, index, this)) return false;
            current = this.getNext(current);
            index++;
        }
        return true;
    }

    /**
     * Changes contents by removing/replacing elements in place.
     * @timeComplexity O(n)
     */
    public splice(start: number, deleteCount?: number, ...items: T[]): LinkedList<T> {
        let startIndex = start < 0 ? Math.max(this.#size + start, 0) : Math.min(start, this.#size);
        let actualDeleteCount = deleteCount === undefined ? this.#size - startIndex : Math.max(0, Math.min(deleteCount, this.#size - startIndex));

        const removedValues = new LinkedList<T>();
        let current = this.#head;
        for (let i = 0; i < startIndex; i++) current = this.getNext(current!);

        let temp = current;
        for (let i = 0; i < actualDeleteCount; i++) {
            if (temp) {
                removedValues.push(temp.value);
                const nextNode = this.getNext(temp);
                const prevNode = this.getPrev(temp);

                if (prevNode) this.setNext(prevNode, nextNode);
                else this.#head = nextNode;

                if (nextNode) this.setPrev(nextNode, prevNode);
                else this.#tail = prevNode;

                temp = nextNode;
                this.#size--;
            }
        }

        let insertionPoint = (temp ? this.getPrev(temp) : null) || this.#tail;
        if (startIndex === 0 && !this.#head) { // List became empty or was empty
            this.push(...items);
        } else {
            for (const item of items) {
                const newNode = new DoublyNode(item);
                if (startIndex === 0 && !insertionPoint) { // Insert at very beginning
                    this.setNext(newNode, this.#head);
                    if (this.#head) this.setPrev(this.#head, newNode);
                    this.#head = newNode;
                    if (!this.#tail) this.#tail = newNode;
                    insertionPoint = newNode;
                } else { // Insert after insertionPoint
                    const nextNode = this.getNext(insertionPoint!);
                    this.setNext(newNode, nextNode);
                    this.setPrev(newNode, insertionPoint);
                    this.setNext(insertionPoint!, newNode);
                    if (nextNode) this.setPrev(nextNode, newNode);
                    else this.#tail = newNode;
                    insertionPoint = newNode;
                }
                this.#size++;
            }
        }

        return removedValues;
    }

    /**
     * Returns the index of the first occurrence of a value, or -1 if not present.
     * @timeComplexity O(n)
     */
    public indexOf(value: T): number {
        let current = this.#head;
        let index = 0;
        while (current) {
            if (current.value === value) return index;
            current = this.getNext(current);
            index++;
        }
        return -1;
    }

    /**
     * Reverses the list in-place (Logically).
     * @returns The reference to the same list.
     * @timeComplexity O(1)
     */
    public reverse(): this {
        const temp = this.#head;
        this.#head = this.#tail;
        this.#tail = temp;
        this.#reverse = !this.#reverse;
        return this;
    }

    /**
     * Returns a shallow copy of a portion of the list.
     * @param start Zero-based index at which to start extraction.
     * @param end Zero-based index before which to end extraction.
     * @timeComplexity O(n)
     */
    public slice(start: number = 0, end: number = this.#size): LinkedList<T> {
        const result = new LinkedList<T>();
        const { startIndex, endIndex } = this.normalizeRange(start, end);

        if (startIndex >= endIndex) return result;

        let current = this.getNodeAt(startIndex);

        for (let i = startIndex; i < endIndex && current; i++) {
            result.push(current.value);
            current = this.getNext(current);
        }
        return result;
    }

    /**
     * Determines whether the list includes a certain value.
     * @timeComplexity O(n)
     */
    public includes(value: T): boolean {
        return this.indexOf(value) !== -1;
    }

    public concat(...items: (T | ConcatArray<T>)[]): LinkedList<T> {
        const result = LinkedList.from(this);
        for (const item of items) {
            if (Array.isArray(item)) {
                for (const subItem of item)
                    result.push(subItem as T);
            } else {
                result.push(item as T);
            }
        }
        return result;
    }

    /**
     * Copies a section of the list to another location within the same list.
     * @timeComplexity O(n)
     */
    public copyWithin(target: number, start: number, end?: number): this {
        const { startIndex, endIndex } = this.normalizeRange(start, end);
        let targetIndex = target < 0 ? Math.max(this.#size + target, 0) : Math.min(target, this.#size);

        if (startIndex >= endIndex || targetIndex >= this.#size) return this;

        const valuesToCopy: T[] = [];
        let current = this.getNodeAt(startIndex);
        for (let i = startIndex; i < endIndex && current; i++) {
            valuesToCopy.push(current.value);
            current = this.getNext(current);
        }

        let targetNode = this.getNodeAt(targetIndex);
        for (const val of valuesToCopy) {
            if (!targetNode) break;
            targetNode.value = val;
            targetNode = this.getNext(targetNode);
        }

        return this;
    }

    public fill(value: T, start: number = 0, end: number = this.#size): this {
        let { startIndex, endIndex } = this.normalizeRange(start, end);
        let current = this.getNodeAt(startIndex);
        for (let i = startIndex; i < endIndex && current; i++) {
            current.value = value;
            current = this.getNext(current);
        }
        return this;
    }

    /**
     * Returns the index of the first element that satisfies the provided testing function.
     * Otherwise, it returns -1.
     * @param predicate Function to test each element.
     * @returns The index of the found element or -1.
     */
    public findIndex(predicate: (value: T, index: number, list: LinkedList<T>) => unknown): number {
        let index = 0;
        let current = this.#head;
        while (current) {
            if (predicate(current.value, index, this))
                return index;
            current = this.getNext(current);
            index++;
        }
        return -1;
    }

    /**
     * Finds the last element without creating a new list instance.
     * @timeComplexity O(n)
     */
    public findLast<S extends T>(predicate: (value: T, index: number, list: LinkedList<T>) => value is S): S | undefined {
        let current = this.#tail;
        let index = this.#size - 1;
        while (current) {
            if (predicate(current.value, index, this)) return current.value as S;
            current = this.getPrev(current);
            index--;
        }
        return undefined;
    }

    public findLastIndex(predicate: (value: T, index: number, list: LinkedList<T>) => unknown): number {
        let index = this.#size - 1;
        let current = this.#tail;
        while (current) {
            if (predicate(current.value, index, this)) return index;
            current = this.getPrev(current);
            index--;
        }
        return -1;
    }

    public lastIndexOf(searchElement: T, fromIndex: number = this.#size - 1): number {
        let index = fromIndex < 0 ? Math.max(0, this.#size + fromIndex) : Math.min(fromIndex, this.#size - 1);
        let current = this.getNodeAt(index);
        while (current) {
            if (current.value === searchElement) return index;
            current = this.getPrev(current);
            index--;
        }
        return -1;
    }

    public reduceRight<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, list: LinkedList<T>) => U, initialValue: U): U {
        let acc = initialValue;
        let index = this.#size - 1;
        let current = this.#tail;
        while (current) {
            acc = callbackfn(acc, current.value, index--, this);
            current = this.getPrev(current);
        }
        return acc;
    }

    // --- UTILITIES ---

    /**
     * Returns the current number of elements in the list.
     */
    public get length(): number { return this.#size; }

    /**
     * Returns the item at that index. Supports negative indexing from the end.
     * @param index Zero-based index (e.g., -1 for the last item).
     * @returns The value at the specified index or undefined.
     * @timeComplexity O(n/2)
     */
    public at(index: number): T | undefined {
        index = index < 0 ? this.#size + index : index;
        return this.getNodeAt(index)?.value ?? undefined;
    }

    /**
     * Sorts the elements of the list in place and returns the reference to the same list.
     * Uses Merge Sort algorithm.
     * @timeComplexity O(n log n)
     */
    public sort(compareFn: (a: T, b: T) => number): this {
        if (this.#size <= 1) return this;

        if (this.#reverse) {
            let curr = this.#head;
            while (curr) {
                const next = curr.next;
                curr.next = curr.prev;
                curr.prev = next;
                curr = next;
            }
            const temp = this.#head;
            this.#head = this.#tail;
            this.#tail = temp;
            this.#reverse = false;
        }

        const merge = (left: DoublyNode<T> | null, right: DoublyNode<T> | null): DoublyNode<T> | null => {
            if (!left) return right;
            if (!right) return left;

            if (compareFn(left.value, right.value) <= 0) {
                left.next = merge(left.next, right);
                if (left.next) left.next.prev = left;
                left.prev = null;
                return left;
            } else {
                right.next = merge(left, right.next);
                if (right.next) right.next.prev = right;
                right.prev = null;
                return right;
            }
        };

        const split = (node: DoublyNode<T>): DoublyNode<T> => {
            let fast: DoublyNode<T> | null = node;
            let slow: DoublyNode<T> = node;

            while (fast?.next?.next) {
                fast = fast.next.next;
                slow = slow.next!;
            }
            const mid = slow.next!;
            slow.next = null;
            if (mid) mid.prev = null;
            return mid;
        };

        const recursiveSort = (node: DoublyNode<T> | null): DoublyNode<T> | null => {
            if (!node || !node.next) return node;
            const mid = split(node);
            return merge(recursiveSort(node), recursiveSort(mid));
        };

        this.#head = recursiveSort(this.#head);

        let temp = this.#head;
        while (temp?.next) temp = temp.next;
        this.#tail = temp;

        return this;
    }

    /**
     * Joins all elements of the list into a string.
     * @param separator A string used to separate each element.
     */
    public join(separator: string = " <-> "): string {
        return [...this].map(v => (v == null ? "" : String(v))).join(separator);
    }

    /**
     * Returns a string representation of the LinkedList.
     */
    public toString(): string {
        return `LinkedList[ ${this.map(v => String(v)).join()} ]`;
    }

    public toLocaleString(): string {
        return `LinkedList[ ${[...this].map(v => (v as any).toLocaleString()).join(" <-> ")} ]`;
    }

    /**
     * Generator for the list values. Enables use in for...of loops.
     */
    public *values(): ListIterator<T> {
        let current = this.#head;
        while (current) {
            yield current.value;
            current = this.getNext(current);
        }
    }

    public *keys(): ListIterator<number> {
        for (let i = 0; i < this.#size; i++)
            yield i;
    }

    public *entries(): ListIterator<[number, T]> {
        let current = this.#head;
        let index = 0;
        while (current) {
            yield [index++, current.value];
            current = this.getNext(current);
        }
    }

    public [Symbol.iterator](): ListIterator<T> {
        return this.values();
    }

    public static from<U>(iterable: Iterable<U>): LinkedList<U> {
        const list = new LinkedList<U>();
        for (const item of iterable) list.push(item);
        return list;
    }

    public get [Symbol.toStringTag]() { return 'LinkedList'; }
}