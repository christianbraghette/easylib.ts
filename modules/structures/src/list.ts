/**
 * Easylib.ts
 * 
 * Copyright 2026 Christian Braghette
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { FlattenStep } from ".";
import { Collection, ConcatIterable, Deque, List } from "./collections";
import { Pipeline, SyncPipelineConstructor } from "./pipeline";

class DoublyLinkedNode {
    constructor(public next?: DoublyLinkedNode, public prev?: DoublyLinkedNode) { }
}

export function isList(obj: Object): boolean {
    return obj instanceof ArrayList || obj instanceof LinkedList;
}

export class ArrayList<T> extends Collection<number, T> implements List<T> {
    [key: number]: T;
    #items: T[];

    constructor(iterable?: Iterable<T>);
    constructor(length?: number);
    constructor(args?: Iterable<T> | number) {
        super();
        if (typeof args === 'number') {
            this.#items = new Array(args);
        } else if (args !== undefined) {
            this.#items = Array.from(args);
        } else {
            this.#items = [];
        }

        const proxy = new Proxy(this, {
            get: (target, prop, receiver) => {
                if (typeof prop === 'string' && /^-?\d+$/.test(prop)) {
                    return target.at(Number(prop));
                }

                const value = Reflect.get(target, prop, receiver);
                if (typeof value === 'function') {
                    return value.bind(target);
                }
                return value;
            },
            set: (target, prop, value) => {
                if (typeof prop === 'string' && /^-?\d+$/.test(prop)) {
                    const index = Number(prop);
                    let pos = index < 0 ? target.length + index : index;

                    if (pos < 0 || pos >= target.length) return false;
                    target.#items[pos] = value;
                    return true;
                }
                return Reflect.set(target, prop, value);
            }
        });

        return proxy;
    }

    public get length(): number {
        return this.#items.length;
    }

    public set length(length: number) {
        this.#items.length = length;
    }

    // ### BASE METHODS

    public push(...items: T[]): number {
        return this.#items.push(...items);
    }

    public pop(): T | undefined {
        return this.#items.pop();
    }

    public shift(): T | undefined {
        return this.#items.shift();
    }

    public unshift(...items: T[]): number {
        return this.#items.unshift(...items);
    }

    public clear(): void {
        this.#items = [];
    }

    // ### LINEAR METHODS

    public reverse(): this {
        this.#items.reverse();
        return this;
    }

    public fill(value: T, start?: number, end?: number): this {
        this.#items.fill(value, start, end);
        return this;
    }

    public includes(searchElement: T, fromIndex?: number): boolean {
        return this.#items.includes(searchElement, fromIndex);
    }

    public remove(value: T): boolean {
        const index = this.#items.indexOf(value);
        if (index !== -1) {
            this.#items.splice(index, 1);
            return true;
        }
        return false;
    }

    public concat(...items: (T | ConcatIterable<T>)[]): ArrayList<T> {
        const result: T[] = [];

        for (let i = 0; i < this.#items.length; i++) {
            result.push(this.#items[i]);
        }

        for (let i = 0; i < items.length; i++) {
            const item = items[i];

            if (typeof item === 'object' && item !== null && Symbol.iterator in item && item[Symbol.isConcatSpreadable] === true) {
                for (const subItem of item as Iterable<T>) {
                    result.push(subItem);
                }
            } else {
                result.push(item as T);
            }
        }

        return new ArrayList<T>(result);
    }

    public join(separator: string = ","): string {
        return this.#items.join(separator);
    }

    // ### INDEXABLE METHODS

    public at(index: number): T | undefined {
        return this.#items.at(index);
    }

    public indexOf(searchElement: T, fromIndex?: number): number {
        return this.#items.indexOf(searchElement, fromIndex);
    }

    public lastIndexOf(searchElement: T, fromIndex?: number): number {
        return this.#items.lastIndexOf(searchElement, fromIndex);
    }

    public slice(start?: number, end?: number): ArrayList<T> {
        return new ArrayList<T>(this.#items.slice(start, end));
    }

    public splice(start: number, deleteCount?: number, ...items: T[]): ArrayList<T> {
        return new ArrayList<T>(this.#items.splice(start, deleteCount ?? (this.#items.length - start), ...items));
    }

    public copyWithin(target: number, start: number, end?: number): this {
        this.#items.copyWithin(target, start, end);
        return this;
    }

    // ### FUNCTIONALS

    public forEach(callbackfn: (value: T, key: number, obj: ArrayList<T>) => void): void {
        this.#items.forEach((v, i) => callbackfn(v, i, this));
    }

    public map<U>(callbackfn: (value: T, key: number, obj: ArrayList<T>) => U): ArrayList<U> {
        return new ArrayList<U>(this.#items.map((v, i) => callbackfn(v, i, this)));
    }

    public filter<S extends T>(predicate: (value: T, key: number, obj: ArrayList<T>) => unknown): ArrayList<S> {
        return new ArrayList<S>(this.#items.filter((v, i) => predicate(v, i, this)) as S[]);
    }

    public reduce<U>(callbackfn: (acc: U, curr: T, key: number, obj: ArrayList<T>) => U, initialValue: U): U {
        return this.#items.reduce((acc, curr, i) => callbackfn(acc, curr, i, this), initialValue);
    }

    public every(predicate: (value: T, key: number, obj: ArrayList<T>) => unknown): boolean {
        return this.#items.every((v, i) => !!predicate(v, i, this));
    }

    public some(predicate: (value: T, key: number, obj: ArrayList<T>) => unknown): boolean {
        return this.#items.some((v, i) => !!predicate(v, i, this));
    }

    public find<S extends T>(predicate: (value: T, key: number, obj: ArrayList<T>) => unknown): S | undefined {
        return this.#items.find((v, i) => predicate(v, i, this)) as S | undefined;
    }

    public findLast<S extends T>(predicate: (value: T, index: number, obj: ArrayList<T>) => unknown): S | undefined {
        for (let i = this.length - 1; i >= 0; i--) {
            const value = this.#items[i];
            if (predicate(value as T, i, this)) {
                return value as S;
            }
        }
        return undefined;
    }

    public findIndex(predicate: (value: T, index: number, obj: ArrayList<T>) => unknown): number {
        return this.#items.findIndex((v, i) => predicate(v, i, this));
    }

    public findLastIndex(predicate: (value: T, index: number, obj: ArrayList<T>) => unknown): number {
        for (let i = this.length - 1; i >= 0; i--) {
            if (predicate(this.#items[i] as T, i, this)) {
                return i;
            }
        }
        return -1;
    }

    public reduceRight<U>(callbackfn: (acc: U, curr: T, i: number, obj: ArrayList<T>) => U, initialValue: U): U {
        return this.#items.reduceRight((acc, curr, i) => callbackfn(acc, curr, i, this), initialValue);
    }

    public flat<D extends number = 1>(depth: D = 1 as D): ArrayList<FlattenStep<T, D>> {
        return new ArrayList<any>(this.#items.flat(depth));
    }

    public flatMap<U>(callbackfn: (value: T, index: number, obj: ArrayList<T>) => U | Iterable<U>): ArrayList<U> {
        const result: U[] = [];

        for (let i = 0; i < this.length; i++) {
            const mapped = callbackfn(this.#items[i] as T, i, this);

            if (typeof mapped === 'object' && mapped !== null && Symbol.iterator in mapped) {
                for (const innerItem of mapped as Iterable<U>) {
                    result.push(innerItem);
                }
            } else {
                result.push(mapped as U);
            }
        }

        return new ArrayList<U>(result);
    }

    public pipe(): Pipeline<T, 'sync'>
    public pipe<U>(transformer: (source: Pipeline<T, 'sync'>) => Pipeline<U, 'sync'>): ArrayList<U>
    public pipe<U>(transformer?: (source: Pipeline<T, 'sync'>) => Pipeline<U, 'sync'>): ArrayList<U> | Pipeline<T, 'sync'> {
        const pipeline = new SyncPipelineConstructor(this.values())
        if (!transformer)
            return pipeline;
        return new ArrayList(transformer(pipeline).sink());
    }

    public sort(compareFn?: (a: T, b: T) => number): this {
        this.#items.sort(compareFn);
        return this;
    }

    // ### ITERATORS

    public keys(): IterableIterator<number> {
        return this.#items.keys();
    }

    public values(): IterableIterator<T> {
        return this.#items.values();
    }

    public entries(): IterableIterator<[number, T]> {
        return this.#items.entries();
    }

    [Symbol.iterator](): IterableIterator<T> {
        return this.values();
    }

    toString(): string {
        return this.join();
    }

    toJSON(): T[] {
        return this.#items.slice();
    }

    get [Symbol.toStringTag](): string { return "ArrayList" };

    public static from<S>(iterable: Iterable<S>): ArrayList<S> {
        return new ArrayList(iterable);
    }
}

export class LinkedList<T> extends Collection<number, T> implements List<T>, Deque<T> {
    #data = new WeakMap<DoublyLinkedNode, T>();
    #next?: DoublyLinkedNode;
    #prev?: DoublyLinkedNode;
    #reversed: boolean = false;
    #length: number = 0;

    /**
     * Creates a new LinkedList from an iterable.
     * @param iterable An iterable object to initialize the list with.
     */
    constructor(iterable?: Iterable<T>) {
        super();
        for (const item of iterable ?? [])
            this.push(item);
    }

    get #head(): DoublyLinkedNode | undefined {
        return this.#reversed ? this.#prev : this.#next;
    }

    set #head(node: DoublyLinkedNode | undefined) {
        if (this.#reversed)
            this.#prev = node;
        else
            this.#next = node;
    }

    get #tail(): DoublyLinkedNode | undefined {
        return this.#reversed ? this.#next : this.#prev;
    }

    set #tail(node: DoublyLinkedNode | undefined) {
        if (this.#reversed)
            this.#next = node;
        else
            this.#prev = node;
    }

    #getValue(node?: DoublyLinkedNode): T | undefined {
        return node ? this.#data.get(node) : undefined;
    }

    #getNext(node?: DoublyLinkedNode): DoublyLinkedNode | undefined {
        return this.#reversed ? node?.prev : node?.next;
    }

    #setNext(curr: DoublyLinkedNode, next: DoublyLinkedNode | undefined): void {
        if (this.#reversed)
            curr.prev = next;
        else
            curr.next = next;
    }

    #getPrev(node?: DoublyLinkedNode): DoublyLinkedNode | undefined {
        return this.#reversed ? node?.next : node?.prev;
    }

    #setPrev(curr: DoublyLinkedNode, prev: DoublyLinkedNode | undefined): void {
        if (this.#reversed)
            curr.next = prev;
        else
            curr.prev = prev;
    }

    //### BASE METHODS

    /**
     * Returns the first element of the list.
     */
    public first(): T | undefined {
        return this.#getValue(this.#head);
    }

    /**
     * Returns the last element of the list.
     */
    public last(): T | undefined {
        return this.#getValue(this.#tail);
    }

    public clear(): void {
        this.#next = undefined;
        this.#prev = undefined;
        this.#length = 0;
    }

    /**
     * Adds one or more elements to the end of the list.
     * @param items The elements to add.
     * @returns The new length of the list.
     */
    public push(...items: T[]): number {
        for (const item of items) {
            const newNode = new DoublyLinkedNode();
            this.#data.set(newNode, item);

            if (!this.#tail) {
                this.#head = newNode;
                this.#tail = newNode;
            } else {
                this.#setNext(this.#tail, newNode);
                this.#setPrev(newNode, this.#tail);
                this.#tail = newNode;
            }
            this.#length++;
        }
        return this.#length;
    }

    /**
     * Adds one or more elements to the beginning of the list.
     * @param items The elements to add.
     * @returns The new length of the list.
     */
    public unshift(...items: T[]): number {
        for (let i = items.length - 1; i >= 0; i--) {
            const item = items[i];
            const newNode = new DoublyLinkedNode();
            this.#data.set(newNode, item);

            if (!this.#head) {
                this.#head = newNode;
                this.#tail = newNode;
            } else {
                this.#setPrev(this.#head, newNode);
                this.#setNext(newNode, this.#head);
                this.#head = newNode;
            }
            this.#length++;
        }
        return this.#length;
    }

    /**
     * Removes and returns the last element of the list.
     */
    public pop(): T | undefined {
        const nodeToRemove = this.#tail;
        if (!nodeToRemove) return undefined;

        const value = this.#getValue(nodeToRemove)!;
        const newTail = this.#getPrev(nodeToRemove);

        this.#tail = newTail;
        if (this.#tail) this.#setNext(this.#tail, undefined);
        else this.#head = undefined;

        this.#data.delete(nodeToRemove);
        this.#length--;
        return value;
    }

    /**
     * Removes and returns the first element of the list.
     */
    public shift(): T | undefined {
        const nodeToRemove = this.#head;
        if (!nodeToRemove) return undefined;

        const value = this.#getValue(nodeToRemove)!;
        const newHead = this.#getNext(nodeToRemove);

        this.#head = newHead;

        if (this.#head) {
            this.#setPrev(this.#head, undefined);
        } else {
            this.#tail = undefined;
        }

        this.#data.delete(nodeToRemove);
        this.#length--;
        return value;
    }

    //### LINEAR METHODS

    /**
     * Gets the number of elements in the list.
     */
    public get length(): number {
        return this.#length;
    };

    /**
     * Reverses the order of the elements in O(1) time.
     * @returns The list instance.
     */
    public reverse(): this {
        this.#reversed = !this.#reversed;
        return this;
    }

    /**
     * Fills all elements in the list with a static value.
     * @param value Value to fill the list with.
     * @returns The list instance.
     */
    public fill(value: T): this {
        for (let node = this.#head; !!node; node = this.#getNext(node)) {
            this.#data.set(node, value);
        }
        return this;
    }

    /**
     * Determines whether the list includes a certain value.
     * @param searchElement The element to search for.
     */
    public includes(searchElement: T): boolean {
        for (let node = this.#head; !!node; node = this.#getNext(node))
            if (this.#data.get(node) === searchElement)
                return true;
        return false;
    }

    /**
     * Removes a specific element from the heap and maintains structural integrity.
     * @param value The element to remove.
     */
    public remove(value: T): boolean {
        let nodeToRemove: DoublyLinkedNode | undefined;

        for (nodeToRemove = this.#head; !!nodeToRemove && this.#data.get(nodeToRemove) !== value; nodeToRemove = this.#getNext(nodeToRemove));
        if (!nodeToRemove) return false;

        const prevNode = this.#getPrev(nodeToRemove);
        const nextNode = this.#getNext(nodeToRemove);

        if (prevNode) this.#setNext(prevNode, nextNode);
        else this.#head = nextNode;

        if (nextNode) this.#setPrev(nextNode, prevNode);
        else this.#tail = prevNode;

        this.#data.delete(nodeToRemove);
        this.#length--;
        return true;
    }

    /**
     * Combines the list with other items or iterables.
     * @param items Items or iterables to concatenate.
     * @returns A new LinkedList.
     */
    public concat(...items: (T | ConcatIterable<T>)[]): LinkedList<T> {
        const self = this;
        const combinedIterable = function* () {
            yield* self;

            for (const item of items) {
                if (typeof item === 'object' && item !== null && Symbol.iterator in item && item[Symbol.isConcatSpreadable] === true) {
                    yield* (item as Iterable<T>);
                } else {
                    yield item as T;
                }
            }
        };

        return new LinkedList<T>(combinedIterable());
    }

    /**
     * Joins all elements into a string.
     * @param separator A string to separate each element.
     */
    public join(separator: string = ","): string {
        let result = "";
        let first = true;

        for (const value of this.values()) {
            if (!first) {
                result += separator;
            }
            result += (value === null || value === undefined) ? "" : String(value);
            first = false;
        }

        return result;
    }

    //### INDEXABLE METHODS

    /**
     * Returns the element at the specified index. Supports negative indexing.
     * @param index Zero-based index.
     */
    public at(index: number): T | undefined {
        let target = index < 0 ? this.length + index : index;
        if (target < 0 || target >= this.length) return undefined;

        const fromStart = target < this.length / 2;
        let curr = fromStart ? this.#head : this.#tail;
        let count = fromStart ? 0 : this.length - 1;

        while (curr) {
            if (count === target) return this.#getValue(curr);
            curr = fromStart ? this.#getNext(curr) : this.#getPrev(curr);
            fromStart ? count++ : count--;
        }
        return undefined;
    }

    /**
     * Returns the index of the first occurrence of a value.
     * @param searchElement The element to locate.
     * @param fromIndex The index to start the search from.
     */
    public indexOf(searchElement: T, fromIndex: number = 0): number {
        let i = 0;
        let start = fromIndex < 0 ? Math.max(this.length + fromIndex, 0) : fromIndex;

        for (let node = this.#head; !!node; node = this.#getNext(node)) {
            if (i >= start && this.#getValue(node) === searchElement) return i;
            i++;
        }
        return -1;
    }

    /**
     * Returns the index of the last occurrence of a value.
     * @param searchElement The element to locate.
     * @param fromIndex The index to start the search from (searching backwards).
     */
    public lastIndexOf(searchElement: T, fromIndex: number = this.length - 1): number {
        let i = this.length - 1;
        let start = fromIndex < 0 ? this.length + fromIndex : fromIndex;

        for (let node = this.#tail; !!node; node = this.#getPrev(node)) {
            if (i <= start && this.#getValue(node) === searchElement) return i;
            i--;
        }
        return -1;
    }

    /**
     * Returns a new LinkedList containing a portion of the list.
     * @param start The beginning index.
     * @param end The end index (exclusive).
     */
    public slice(start: number = 0, end: number = this.length): LinkedList<T> {
        const s = start < 0 ? Math.max(this.length + start, 0) : Math.min(start, this.length);
        const e = end < 0 ? Math.max(this.length + end, 0) : Math.min(end, this.length);

        const self = this;
        const sliceGenerator = function* () {
            let i = 0;
            for (const val of self.values()) {
                if (i >= s && i < e) yield val;
                if (i >= e) break;
                i++;
            }
        };
        return new LinkedList<T>(sliceGenerator());
    }

    /**
     * Changes the contents of the list by removing or replacing existing elements.
     * @param start The index at which to start changing the list.
     * @param deleteCount The number of elements to remove.
     * @param items The elements to add to the list.
     * @returns A new LinkedList containing the deleted elements.
     */
    public splice(start: number, deleteCount?: number, ...items: T[]): LinkedList<T> {
        const s = start < 0 ? Math.max(this.length + start, 0) : Math.min(start, this.length);
        const d = deleteCount === undefined ? this.length - s : Math.max(Math.min(deleteCount, this.length - s), 0);

        const removed: T[] = [];

        let cursor = this.#head;
        for (let i = 0; i < s; i++)
            cursor = this.#getNext(cursor);

        for (let i = 0; i < d; i++) {
            if (!cursor) break;
            const val = this.#getValue(cursor)!;
            removed.push(val);

            const nextNode = this.#getNext(cursor);
            const prevNode = this.#getPrev(cursor);

            if (prevNode) this.#setNext(prevNode, nextNode);
            else this.#head = nextNode;

            if (nextNode) this.#setPrev(nextNode, prevNode);
            else this.#tail = prevNode;

            const toDelete = cursor;
            cursor = nextNode;

            this.#data.delete(toDelete);
            this.#length--;
        }

        for (const item of items) {
            const newNode = new DoublyLinkedNode();
            this.#data.set(newNode, item);

            if (!cursor) {
                const beforeNode = this.#tail;
                if (!beforeNode) {
                    this.#head = newNode;
                    this.#tail = newNode;
                } else {
                    this.#setNext(beforeNode, newNode);
                    this.#setPrev(newNode, beforeNode);
                    this.#tail = newNode;
                }
            } else {
                const beforeNode = this.#getPrev(cursor);
                if (!beforeNode) {
                    this.#setNext(newNode, cursor);
                    this.#setPrev(cursor, newNode);
                    this.#head = newNode;
                } else {
                    this.#setNext(beforeNode, newNode);
                    this.#setPrev(newNode, beforeNode);
                    this.#setNext(newNode, cursor);
                    this.#setPrev(cursor, newNode);
                }
            }
            this.#length++;
        }

        return new LinkedList<T>(removed);
    }

    /**
     * Copies a sequence of elements within the list.
     * @param target Index at which to copy the sequence to.
     * @param start Index at which to start copying elements from.
     * @param end Index at which to end copying elements from.
     */
    public copyWithin(target: number, start: number, end: number = this.length): this {
        const t = target < 0 ? Math.max(this.length + target, 0) : Math.min(target, this.length);
        const s = start < 0 ? Math.max(this.length + start, 0) : Math.min(start, this.length);
        const e = end < 0 ? Math.max(this.length + end, 0) : Math.min(end, this.length);

        if (t >= this.length || s >= e) return this;

        const buffer: T[] = [];
        let nodeS = this.#head;
        for (let i = 0; i < s; i++) nodeS = this.#getNext(nodeS);

        let count = 0;
        const limit = e - s;
        while (nodeS && count < limit) {
            buffer.push(this.#getValue(nodeS)!);
            nodeS = this.#getNext(nodeS);
            count++;
        }

        let nodeT = this.#head;
        for (let i = 0; i < t; i++) nodeT = this.#getNext(nodeT);

        for (const val of buffer) {
            if (!nodeT) break;

            this.#data.set(nodeT, val);

            nodeT = this.#getNext(nodeT);
        }

        return this;
    }

    //### DEFAULT FUNCTIONALS

    /**
     * Executes a provided function once for each list element.
     */
    public forEach(callbackfn: (value: T, key: number, obj: LinkedList<T>) => void): void {
        let i = 0;
        for (const value of this.values()) {
            callbackfn(value, i++, this);
        }
    }

    /**
     * Creates a new list with the results of calling a provided function on every element.
     */
    public map<U>(callbackfn: (value: T, key: number, obj: LinkedList<T>) => U): LinkedList<U> {
        const self = this;
        const mappedGenerator = function* () {
            let i = 0;
            for (const value of self.values()) {
                yield callbackfn(value, i++, self);
            }
        };
        return new LinkedList<U>(mappedGenerator());
    }

    /**
     * Creates a new list with all elements that pass the test implemented by the provided function.
     */
    public filter<S extends T>(predicate: (value: T, key: number, obj: LinkedList<T>) => unknown): LinkedList<S> {
        const self = this;
        const filteredGenerator = function* () {
            let i = 0;
            for (const value of self.values()) {
                if (predicate(value, i, self)) yield value as S;
                i++;
            }
        };
        return new LinkedList<S>(filteredGenerator());
    }

    /**
     * Executes a reducer function on each element, resulting in a single output value.
     */
    public reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentKey: number, obj: LinkedList<T>) => U, initialValue: U): U {
        let accumulator = initialValue;
        let i = 0;
        for (const value of this.values()) {
            accumulator = callbackfn(accumulator, value, i++, this);
        }
        return accumulator;
    }

    /**
     * Tests whether all elements in the list pass the test implemented by the provided function.
     */
    public every(predicate: (value: T, key: number, obj: LinkedList<T>) => unknown): boolean {
        let i = 0;
        for (const value of this.values()) {
            if (!predicate(value, i++, this)) return false;
        }
        return true;
    }

    /**
     * Tests whether at least one element in the list passes the test implemented by the provided function.
     */
    public some(predicate: (value: T, key: number, obj: LinkedList<T>) => unknown): boolean {
        let i = 0;
        for (const value of this.values()) {
            if (predicate(value, i++, this)) return true;
        }
        return false;
    }

    /**
     * Returns the value of the first element that satisfies the provided testing function.
     */
    public find<S extends T>(predicate: (value: T, key: number, obj: LinkedList<T>) => unknown): S | undefined {
        let i = 0;
        for (const value of this.values()) {
            if (predicate(value, i++, this)) return value as S;
        }
        return undefined;
    }

    //### LINEAR FUNCTIONALS

    /**
     * Returns the value of the last element that satisfies the provided testing function.
     */
    public findLast<S extends T>(predicate: (value: T, index: number, obj: LinkedList<T>) => unknown): S | undefined {
        let i = this.length - 1;
        for (let node = this.#tail; !!node; node = this.#getPrev(node)) {
            const value = this.#getValue(node) as T;
            if (predicate(value, i--, this)) return value as S;
        }
        return undefined;
    }

    /**
     * Executes a reducer function on each element (from right-to-left).
     */
    public reduceRight<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, obj: LinkedList<T>) => U, initialValue: U): U {
        let accumulator = initialValue;
        let i = this.length - 1;
        for (let node = this.#tail; !!node; node = this.#getPrev(node)) {
            accumulator = callbackfn(accumulator, this.#getValue(node)!, i--, this);
        }
        return accumulator;
    }

    /**
     * Returns a new list with all sub-list elements concatenated into it recursively up to the specified depth.
     */
    public flat<D extends number = 1>(depth: D = 1 as D): LinkedList<FlattenStep<T, D>> {
        const self = this;
        const flatten = function* (iterable: Iterable<any>, currentDepth: number): Generator<FlattenStep<T, D>> {
            for (const item of iterable) {
                if (currentDepth > 0 && typeof item === 'object' && item !== null && Symbol.iterator in item) {
                    yield* flatten(item, currentDepth - 1);
                } else {
                    yield item as FlattenStep<T, D>;
                }
            }
        };
        return new LinkedList<FlattenStep<T, D>>(flatten(self, depth));
    }

    /**
     * Returns a new list formed by applying a given callback function to each element and then flattening the result by one level.
     */
    public flatMap<U>(callbackfn: (value: T, index: number, obj: LinkedList<T>) => U | Iterable<U>): LinkedList<U> {
        const self = this;
        const flatMappedGenerator = function* () {
            let i = 0;
            for (const value of self.values()) {
                const mapped = callbackfn(value, i++, self);
                if (typeof mapped === 'object' && mapped !== null && Symbol.iterator in mapped) {
                    yield* mapped as Iterable<U>;
                } else {
                    yield mapped as U;
                }
            }
        };
        return new LinkedList<U>(flatMappedGenerator());
    }

    public pipe(): Pipeline<T, 'sync'>
    public pipe<U>(transformer: (source: Pipeline<T, 'sync'>) => Pipeline<U, 'sync'>): LinkedList<U>
    public pipe<U>(transformer?: (source: Pipeline<T, 'sync'>) => Pipeline<U, 'sync'>): LinkedList<U> | Pipeline<T, 'sync'> {
        const pipeline = new SyncPipelineConstructor(this.values())
        if (!transformer)
            return pipeline;
        return new LinkedList(transformer(pipeline).sink());
    }

    /**
     * Sorts the elements of the list in place and returns the list.
     * @param compareFn Function used to determine the order of the elements.
     */
    public sort(compareFn?: (a: T, b: T) => number): this {
        if (this.length <= 1) return this;

        const compare = compareFn ?? ((a, b) => a == b ? 0 : a < b ? -1 : 1);

        let head = this.#head;

        for (let step = 1; step < this.length; step *= 2) {
            let curr: DoublyLinkedNode | undefined = head;
            let newHead: DoublyLinkedNode | undefined = undefined;
            let listTail: DoublyLinkedNode | undefined = undefined;

            while (curr) {
                const left = curr;
                const right = this.#split(left, step);
                curr = this.#split(right, step);

                const merged = this.#merge(left, right, compare);

                if (!newHead) {
                    newHead = merged;
                } else {
                    this.#setNext(listTail!, merged);
                    if (merged) this.#setPrev(merged, listTail);
                }

                while (listTail && this.#getNext(listTail))
                    listTail = this.#getNext(listTail);
                if (!listTail) {
                    listTail = newHead;
                    while (listTail && this.#getNext(listTail))
                        listTail = this.#getNext(listTail);
                }
            }

            head = newHead;
        }

        this.#head = head;
        if (head) this.#setPrev(head, undefined);

        let logicalTail = head;
        while (logicalTail && this.#getNext(logicalTail))
            logicalTail = this.#getNext(logicalTail);
        this.#tail = logicalTail;

        return this;
    }


    /**
     * Splits the list after `n` nodes and returns the rest.
     * (invariato, già corretto)
     */
    #split(node: DoublyLinkedNode | undefined, n: number): DoublyLinkedNode | undefined {
        if (!node) return undefined;

        for (let i = 1; i < n && this.#getNext(node); i++)
            node = this.#getNext(node)!;

        const rest = this.#getNext(node);
        this.#setNext(node, undefined);
        if (rest) this.#setPrev(rest, undefined);
        return rest;
    }

    /**
     * Merges two sorted sublists iteratively (no recursion, O(1) stack).
     */
    #merge(left: DoublyLinkedNode | undefined, right: DoublyLinkedNode | undefined, compare: (a: T, b: T) => number): DoublyLinkedNode | undefined {
        if (!left) return right;
        if (!right) return left;

        const dummy = new DoublyLinkedNode();
        let curr: DoublyLinkedNode = dummy;

        while (left && right) {
            const leftVal = this.#data.get(left)!;
            const rightVal = this.#data.get(right)!;

            if (compare(leftVal, rightVal) <= 0) {
                const nextLeft = this.#getNext(left);   // ← salva prima
                this.#setNext(curr, left);
                this.#setPrev(left, curr);
                this.#setNext(left, undefined);          // ← spezza il vecchio link in sicurezza
                curr = left;
                left = nextLeft;
            } else {
                const nextRight = this.#getNext(right);  // ← salva prima
                this.#setNext(curr, right);
                this.#setPrev(right, curr);
                this.#setNext(right, undefined);         // ← spezza il vecchio link in sicurezza
                curr = right;
                right = nextRight;
            }
        }

        const remainder = left ?? right;
        this.#setNext(curr, remainder);
        if (remainder) this.#setPrev(remainder, curr);

        const result = this.#getNext(dummy);
        if (result) this.#setPrev(result, undefined);
        return result;
    }

    //### INDEXABLE FUNCTIONALS

    /**
     * Returns the index of the first element that satisfies the provided testing function.
     */
    public findIndex(predicate: (value: T, index: number, obj: LinkedList<T>) => unknown): number {
        let i = 0;
        for (const value of this.values()) {
            if (predicate(value, i, this)) return i;
            i++;
        }
        return -1;
    }

    /**
     * Returns the index of the last element that satisfies the provided testing function.
     */
    public findLastIndex(predicate: (value: T, index: number, obj: LinkedList<T>) => unknown): number {
        let i = this.length - 1;
        for (let node = this.#tail; !!node; node = this.#getPrev(node)) {
            const value = this.#getValue(node)!;
            if (predicate(value, i, this)) return i;
            i--;
        }
        return -1;
    }

    //### SPECIFIC METHODS

    /**
     * Rotates the elements of the list.
     * @param n If positive, rotates to the right. If negative, rotates to the left.
     */
    public rotate(n: number = 1): this {
        if (this.length <= 1 || n % this.length === 0) return this;

        let k = n % this.length;
        if (k < 0) k += this.length;

        let newTailIndex = this.length - k - 1;
        let newTail = this.#head;

        if (newTailIndex < this.length / 2) {
            for (let i = 0; i < newTailIndex; i++) newTail = this.#getNext(newTail);
        } else {
            newTail = this.#tail;
            for (let i = 0; i < (this.length - 1 - newTailIndex); i++) newTail = this.#getPrev(newTail);
        }

        const newHead = this.#getNext(newTail);
        const oldHead = this.#head;
        const oldTail = this.#tail;

        if (newHead && newTail && oldHead && oldTail) {
            this.#setNext(oldTail, oldHead);
            this.#setPrev(oldHead, oldTail);

            this.#head = newHead;
            this.#tail = newTail;

            this.#setPrev(this.#head, undefined);
            this.#setNext(this.#tail, undefined);
        }

        return this;
    }

    /**
     * Remove duplicate elements in the list.
     */
    public deduplicate(): this {
        const seen = new Set<T>();
        return this.#filterInPlace((val) => {
            if (seen.has(val)) return false;
            seen.add(val);
            return true;
        });
    }

    #filterInPlace(predicate: (value: T, index: number, obj: this) => boolean): this {
        let node = this.#head;
        let i = 0;

        while (node) {
            const val = this.#getValue(node)!;
            const next = this.#getNext(node);

            if (!predicate(val, i++, this)) {
                const p = this.#getPrev(node);
                const n = this.#getNext(node);

                if (p) this.#setNext(p, n);
                else this.#head = n;

                if (n) this.#setPrev(n, p);
                else this.#tail = p;

                this.#data.delete(node);
                this.#length--;
            }
            node = next;
        }
        return this;
    }

    //### ITERATORS

    /**
     * Returns an iterator for the indices of the list.
     */
    public *keys(): IterableIterator<number> {
        for (let i = 0; i < this.length; i++)
            yield i;
    }

    /**
     * Returns an iterator for the values of the list.
     */
    public *values(): IterableIterator<T> {
        for (let node = this.#head; !!node; node = this.#getNext(node))
            yield this.#getValue(node)!;
    }

    /**
     * Returns an iterator for key-value pairs of the list.
     */
    public *entries(): IterableIterator<[number, T]> {
        for (let node = this.#head, i = 0; !!node && i < this.length; node = this.#getNext(node), i++)
            yield [i, this.#getValue(node)!];
    }

    /**
     * Default iterator for the list.
     */
    [Symbol.iterator](): IterableIterator<T> {
        return this.values();
    }

    toString(): string {
        return this.join();
    }

    toJSON(): T[] {
        const array = new Array(this.#length);
        let i = 0;
        for (const entry of this.values())
            array[i++] = entry;
        return array;
    }

    get [Symbol.toStringTag](): string { return "LinkedList" };

    public static from<S>(iterable: Iterable<S>): LinkedList<S> {
        return new LinkedList(iterable);
    }
}