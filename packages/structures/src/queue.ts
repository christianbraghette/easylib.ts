import { BinaryHeap } from "./heap";
import type { Queue } from "./interfaces";
import { LinkedList } from "./list";

class QueueNode {
    constructor(public next?: QueueNode, public prev?: QueueNode) { }
}

export class LinkedQueue<T> implements Queue<T> {
    #nodes = new WeakMap<QueueNode, T>();
    #counts = new Map<T, number>();
    #head?: QueueNode;
    #tail?: QueueNode;
    #length = 0;

    constructor(iterable?: Iterable<T>) {
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
            const newNode = new QueueNode();
            this.#nodes.set(newNode, item);

            if (!this.#head) {
                this.#head = newNode;
                this.#tail = newNode;
            } else {
                newNode.next = this.#head;
                this.#head.prev = newNode;
                this.#head = newNode;
            }

            this.#counts.set(item, (this.#counts.get(item) ?? 0) + 1);
            this.#length++;
        }
        return this.#length;
    }

    /**
     * Removes and returns the element at the end of the queue.
     * @returns The removed element, or undefined if the stack is empty.
     */
    public shift(): T | undefined {
        if (!this.#tail) return undefined;

        const node = this.#tail;
        const value = this.#nodes.get(node)!;

        this.#tail = node.prev;
        if (this.#tail) this.#tail.next = undefined;
        else this.#head = undefined;

        node.prev = undefined;
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
        else this.#tail = node.prev;

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
    public first(): T | undefined {
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
    public concat(...items: (T | Iterable<T>)[]): LinkedQueue<T> {
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

        return new LinkedQueue<T>(combinedIterable());
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

    public keys(): IterableIterator<T> {
        return this.values()
    }

    /**
     * Returns an iterator for the values in the stack.
     */
    public *values(): IterableIterator<T> {
        for (let node = this.#tail; !!node; node = node.prev)
            yield this.#nodes.get(node)!;
    }

    /**
     * Returns an iterator for [value, value] pairs.
     */
    public *entries(): IterableIterator<[T, T]> {
        for (const value of this.values())
            yield [value, value];
    }

    [Symbol.iterator](): IterableIterator<T> {
        return this.values();
    }

    [Symbol.toStringTag] = "QueueStack";
}

class PriorityQueueNode {
    constructor(public priority: number) { }
}

export class PriorityQueue<T> implements Queue<T> {
    #data = new WeakMap<PriorityQueueNode, T>();
    #nodes = new Map<T, LinkedList<PriorityQueueNode>>();
    #heap = new BinaryHeap<PriorityQueueNode>((a, b) => b.priority - a.priority);

    /**
     * Creates an instance of PriorityQueue.
     * @param iterable An optional iterable of [priority, value] pairs to initialize the queue.
     */
    constructor(iterable?: Iterable<[number, T]>) {
        for (const [priority, value] of iterable ?? [])
            this.push(value, priority);
    }

    /**
     * Gets the number of elements currently in the priority queue.
     * @returns The total count of items.
     */
    public get length(): number {
        return this.#heap.length;
    }

    /**
     * Returns the value of the highest priority element without removing it.
     * @returns The value of the first element, or undefined if the queue is empty.
     */
    public first(): T | undefined {
        return this.#data.get(this.#heap.peek());
    }

    public clear(): void {
        for (const list of this.#nodes.values())
            list.clear();
        this.#nodes.clear();
        this.#heap.clear();
    }

    /**
     * Removes and returns the highest priority element from the queue.
     * @returns The value of the removed element, or undefined if the queue is empty.
     */
    public shift(): T | undefined {
        const node = this.#heap.shift();
        if (!node) return undefined;

        const value = this.#data.get(node)!;
        this.#data.delete(node);

        const nodes = this.#nodes.get(value);
        if (nodes) {
            nodes.remove(node);
            if (nodes.length === 0) {
                this.#nodes.delete(value);
            }
        }

        return value;
    }

    /**
     * Adds an item to the queue with a specified priority.
     * @param item The value to add to the queue.
     * @param priority The priority level (higher values typically processed first depending on compareFn). 
     * Defaults to 0.
     * @returns The new length of the queue.
     */
    public push(item: T, priority: number = 0): number {
        const node = new PriorityQueueNode(priority);
        this.#data.set(node, item);

        const nodes = this.#nodes.get(item) ?? new LinkedList<PriorityQueueNode>();
        nodes.push(node);
        this.#nodes.set(item, nodes);

        this.#heap.push(node);
        return this.length;
    }

    /**
     * Removes a specific value from the queue.
     * @param value The value to find and remove.
     * @returns True if the element was found and removed; otherwise, false.
     */
    public remove(value: T): boolean {
        const nodes = this.#nodes.get(value);
        if (!nodes || nodes.length === 0) return false;

        const nodeToRemove = nodes.pop()!;
        if (nodes.length === 0) {
            this.#nodes.delete(value);
        }

        this.#data.delete(nodeToRemove);
        return this.#heap.remove(nodeToRemove);
    }

    /**
     * Executes a provided function once for each element in the queue, in priority order.
     * @param callbackfn Function to execute for each element.
     */
    public forEach(callbackfn: (value: T, priority: number, obj: PriorityQueue<T>) => void): void {
        for (const node of this.#heap.values())
            callbackfn(this.#data.get(node)!, node.priority, this);
    }

    /**
     * Creates a new PriorityQueue with the results of calling a provided function 
     * on every element in this queue.
     * @param callbackfn Function that produces an element of the new PriorityQueue.
     * @returns A new PriorityQueue with mapped values.
     */
    public map<U>(callbackfn: (value: T, priority: number, obj: PriorityQueue<T>) => U): PriorityQueue<U> {
        const newQueue = new PriorityQueue<U>();
        for (const node of this.#heap.values())
            newQueue.push(callbackfn(this.#data.get(node)!, node.priority, this), node.priority);
        return newQueue;
    }

    /**
     * Replaces all existing elements in the queue with a specific value at a given priority.
     * @param value Value to fill the queue with.
     * @param priority Priority to assign to the filled values. Defaults to 0.
     * @returns The current PriorityQueue instance.
     */
    public fill(value: T, priority: number = 0): this {
        const currentLength = this.length;
        this.#heap = new BinaryHeap<PriorityQueueNode>((a, b) => b.priority - a.priority);
        this.#nodes.clear();
        for (let i = 0; i < currentLength; i++) {
            this.push(value, priority);
        }
        return this;
    }

    /**
     * Determines whether the queue includes a certain element.
     * @param searchElement The element to search for.
     * @returns True if the element exists in the queue, false otherwise.
     */
    public includes(searchElement: T): boolean {
        return this.#nodes.has(searchElement);
    }

    /**
     * Combines the current queue with other items or iterables, returning a new PriorityQueue.
     * New items are assigned a default priority of 0.
     * @param items Additional items or iterables to append.
     * @returns A new PriorityQueue instance.
     */
    public concat(...items: (T | Iterable<T>)[]): PriorityQueue<T> {
        const newQueue = new PriorityQueue<T>();
        for (const [prio, val] of this.entries())
            newQueue.push(val, prio);

        for (const item of items) {
            if (Symbol.iterator in (item as any)) {
                for (const subItem of item as Iterable<T>) newQueue.push(subItem, 0);
            } else {
                newQueue.push(item as T, 0);
            }
        }
        return newQueue;
    }

    /**
     * Adds all the elements of the queue into a string, separated by the specified separator string.
     * @param separator A string used to separate one element of the queue from the next.
     */
    public join(separator: string = ","): string {
        return Array.from(this.values()).join(separator);
    }

    /**
     * Returns the value of the first element in the queue where predicate is true, and undefined otherwise.
     * @param predicate A function to test each element.
     */
    public find<S extends T>(predicate: (value: T, priority: number, obj: PriorityQueue<T>) => boolean | undefined | null): S | undefined {
        for (const [prio, val] of this.entries()) {
            if (predicate(val, prio, this)) return val as S;
        }
        return undefined;
    }

    /**
     * Determines whether the specified callback function returns true for any element of the queue.
     * @param predicate A function to test each element.
     */
    public some(predicate: (value: T, priority: number, obj: PriorityQueue<T>) => boolean | undefined | null): boolean {
        for (const [prio, val] of this.entries()) {
            if (predicate(val, prio, this)) return true;
        }
        return false;
    }

    /**
     * Determines whether all the members of the queue satisfy the specified test.
     * @param predicate A function to test each element.
     */
    public every(predicate: (value: T, priority: number, obj: PriorityQueue<T>) => boolean | undefined | null): boolean {
        for (const [prio, val] of this.entries()) {
            if (!predicate(val, prio, this)) return false;
        }
        return this.length > 0;
    }

    /**
     * Determines whether all the members of the queue satisfy the specified test.
     * @param predicate A function to test each element.
     */
    public findLast<S extends T>(predicate: (value: T, priority: number, obj: PriorityQueue<T>) => boolean | undefined | null): S | undefined {
        const items = Array.from(this.entries());
        for (let i = items.length - 1; i >= 0; i--) {
            const [prio, val] = items[i];
            if (predicate(val as T, prio, this)) return val as S;
        }
        return undefined;
    }

    /**
     * Returns a new PriorityQueue containing all elements that pass the test implemented by the provided function.
     * @param predicate A function to test each element.
     */
    public filter<S extends T>(predicate: (value: T, priority: number, obj: PriorityQueue<T>) => boolean | undefined | null): PriorityQueue<S> {
        const newQueue = new PriorityQueue<S>();
        for (const [prio, val] of this.entries()) {
            if (predicate(val, prio, this)) newQueue.push(val as S, prio);
        }
        return newQueue;
    }

    /**
     * Calls the specified callback function for all the elements in the queue. 
     * The return value of the callback function is the accumulated result.
     * @param callbackfn A function that accepts up to four arguments.
     * @param initialValue The initial value for the accumulator.
     */
    public reduce<U>(callbackfn: (acc: U, val: T, prio: number, obj: PriorityQueue<T>) => U, initialValue: U): U {
        let acc = initialValue;
        for (const [prio, val] of this.entries()) {
            acc = callbackfn(acc, val, prio, this);
        }
        return acc;
    }

    /**
     * Calls the specified callback function for all the elements in the queue, in reverse priority order.
     * @param callbackfn A function that accepts up to four arguments.
     * @param initialValue The initial value for the accumulator.
     */
    public reduceRight<U>(callbackfn: (acc: U, val: T, prio: number, obj: PriorityQueue<T>) => U, initialValue: U): U {
        const items = Array.from(this.entries());
        let acc = initialValue;
        for (let i = items.length - 1; i >= 0; i--) {
            const [prio, val] = items[i];
            acc = callbackfn(acc, val, prio, this);
        }
        return acc;
    }

    /**
     * Calls a defined callback function on each element of the queue and flattens the result into a new PriorityQueue.
     * @param callbackfn A function that accepts up to three arguments.
     */
    public flatMap<U>(callbackfn: (value: T, priority: number, obj: PriorityQueue<T>) => U | Iterable<U>): PriorityQueue<U> {
        const newQueue = new PriorityQueue<U>();
        for (const [prio, val] of this.entries()) {
            const result = callbackfn(val, prio, this);
            if (Symbol.iterator in (result as any)) {
                for (const sub of result as Iterable<U>) newQueue.push(sub, prio);
            } else {
                newQueue.push(result as U, prio);
            }
        }
        return newQueue;
    }

    /**
     * Returns a new PriorityQueue with all sub-iterable elements concatenated into it recursively up to the specified depth.
     * @param depth The maximum recursion depth. Defaults to 1.
     */
    public flat<S>(depth: number = 1): PriorityQueue<S> {
        const newQueue = new PriorityQueue<S>();

        const flatten = (item: any, currentPrio: number, currentDepth: number) => {
            if (currentDepth > 0 && item != null && typeof item[Symbol.iterator] === 'function') {
                for (const subItem of item) {
                    flatten(subItem, currentPrio, currentDepth - 1);
                }
            } else {
                newQueue.push(item as S, currentPrio);
            }
        };

        for (const [prio, val] of this.entries()) {
            flatten(val, prio, depth);
        }

        return newQueue;
    }

    /**
     * Returns an iterable of priorities in the queue.
     */
    public *keys(): IterableIterator<number> {
        for (const node of this.#heap.values())
            yield node.priority;
    }

    /**
     * Returns an iterable of values in the queue, ordered by priority.
     */
    public *values(): IterableIterator<T> {
        for (const node of this.#heap.values())
            yield this.#data.get(node)!;
    }

    /**
     * Returns an iterable of [priority, value] pairs for every entry in the queue.
     */
    public *entries(): IterableIterator<[number, T]> {
        for (const node of this.#heap.values())
            yield [node.priority, this.#data.get(node)!];
    }

    [Symbol.iterator](): IterableIterator<T> {
        return this.values();
    }

    [Symbol.toStringTag]: string = "PriorityQueue";
}