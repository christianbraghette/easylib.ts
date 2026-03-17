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

import { Collection, type Stack } from "./collections"
import { LinkedList } from "./list";
import { Pipeline, SyncPipelineConstructor } from "./pipeline";

export function isStack(obj: Object): boolean {
    return obj instanceof LinkedStack || obj instanceof LinkedList;
}

class StackNode {
    constructor(public next?: StackNode, public prev?: StackNode) { }
}

export class LinkedStack<T> extends Collection<number, T> implements Stack<T> {
    #nodes = new WeakMap<StackNode, T>();
    #counts = new Map<T, number>();
    #head?: StackNode;
    #length = 0;

    constructor(iterable?: Iterable<T>) {
        super();
        for (const item of iterable ?? [])
            this.push(item);
    }

    /**
     * The number of elements in the stack.
     */
    get length(): number {
        return this.#length;
    }

    /**
     * Adds one or more elements to the top of the stack.
     * @param items The elements to push.
     * @returns The new length of the stack.
     */
    public push(...items: T[]): number {
        for (const item of items) {
            const newNode = new StackNode(this.#head);
            if (this.#head) this.#head.prev = newNode;
            this.#head = newNode;

            this.#nodes.set(newNode, item);
            this.#counts.set(item, (this.#counts.get(item) ?? 0) + 1);
            this.#length++;
        }
        return this.#length;
    }

    /**
     * Removes and returns the element at the top of the stack.
     * @returns The removed element, or undefined if the stack is empty.
     */
    public pop(): T | undefined {
        if (!this.#head) return undefined;

        const node = this.#head;
        const value = this.#nodes.get(node)!;

        this.#head = node.next;
        if (this.#head) this.#head.prev = undefined;

        node.next = undefined;
        this.#nodes.delete(node);
        this.#decrementCount(value);
        this.#length--;

        return value;
    }

    /**
     * Removes the first occurrence of a specific value from the stack.
     * @param value The element to remove.
     * @returns True if an element was removed, false otherwise.
     */
    public remove(value: T): boolean {
        let node = this.#head;
        while (node && this.#nodes.get(node) !== value) {
            node = node.next;
        }

        if (!node) return false;

        if (node.prev) node.prev.next = node.next;
        else this.#head = node.next;

        if (node.next) node.next.prev = node.prev;

        this.#nodes.delete(node);
        this.#decrementCount(value);
        this.#length--;
        return true;
    }

    #decrementCount(value: T) {
        const count = this.#counts.get(value);
        if (count === 1) this.#counts.delete(value);
        else if (count) this.#counts.set(value, count - 1);
    }

    /**
     * Returns the element at the top of the stack without removing it.
     * @returns The top element, or undefined if empty.
     */
    public last(): T | undefined {
        if (!this.#head)
            return;
        return this.#nodes.get(this.#head);
    }

    /**
     * Replaces all elements in the stack with a static value.
     * @param value The value to fill the stack with.
     * @returns The stack instance.
     */
    public fill(value: T): this {
        this.#counts.clear();
        if (this.#length > 0) {
            this.#counts.set(value, this.#length);
            for (let node = this.#head; !!node; node = node.next) {
                this.#nodes.set(node, value);
            }
        }
        return this;
    }

    /**
     * Determines whether an element is in the stack in O(1) time.
     * @param searchElement The element to locate.
     * @returns True if the element exists, false otherwise.
     */
    public includes(searchElement: T): boolean {
        return this.#counts.has(searchElement);
    }

    /**
     * Combines the stack with other items or iterables into a new LinkedStack.
     * @param items Items or iterables to concatenate.
     * @returns A new LinkedStack instance.
     */
    public concat(...items: (T | Iterable<T>)[]): LinkedStack<T> {
        const self = this;
        const combinedIterable = function* () {
            yield* self;

            for (const item of items) {
                if (typeof item === 'object' && item !== null && Symbol.iterator in item) {
                    yield* (item as Iterable<T>);
                } else {
                    yield item as T;
                }
            }
        };

        return new LinkedStack<T>(combinedIterable());
    }

    /**
     * Joins all elements of the stack into a string.
     * @param separator A string used to separate elements.
     * @returns A string representation of the stack.
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

    /**
     * Removes all elements from the stack.
     */
    public clear(): void {
        this.#counts.clear();
        this.#head = undefined;
        this.#length = 0;
    }

    public pipe(): Pipeline<T, 'sync'>
    public pipe<U>(transformer: (source: Pipeline<T, 'sync'>) => Pipeline<U, 'sync'>): LinkedStack<U>
    public pipe<U>(transformer?: (source: Pipeline<T, 'sync'>) => Pipeline<U, 'sync'>): LinkedStack<U> | Pipeline<T, 'sync'> {
        const pipeline = new SyncPipelineConstructor(this.values())
        if (!transformer)
            return pipeline;
        return new LinkedStack(transformer(pipeline).sink());
    }

    public *keys(): IterableIterator<number> {
        let i = 0;
        for (let node = this.#head; !!node; node = node.next)
            yield i++;
    }

    /**
     * Returns an iterator for the values in the stack.
     */
    public *values(): IterableIterator<T> {
        for (let node = this.#head; !!node; node = node.next)
            yield this.#nodes.get(node)!;
    }

    /**
     * Returns an iterator for [value, value] pairs.
     */
    public *entries(): IterableIterator<[number, T]> {
        let i = 0;
        for (const value of this.values())
            yield [i++, value];
    }

    [Symbol.iterator](): IterableIterator<T> {
        return this.values();
    }

    toJSON(): T[] {
        const array = new Array(this.#length);
        let i = 0;
        for (const entry of this)
            array[i++] = entry;
        return array;
    }

    get [Symbol.toStringTag](): string { return "LinkedStack"; }
}