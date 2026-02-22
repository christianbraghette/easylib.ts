import { Queue } from "./interfaces";
import { ArrayList, LinkedList } from "./list";
import { HashMap } from "./map";

class BinaryHeap<T> {
    #array = new ArrayList<T>();

    constructor(private compareFn: (a: T, b: T) => number, initialData?: Iterable<T>) {
        for (const data of initialData ?? [])
            this.push(data);
    }

    public get length() {
        return this.#array.length;
    }

    public peek(): T {
        return this.#array[0];
    }

    public push(...items: T[]): number {
        for (const item of items) {
            this.#array.push(item);
            this.bubbleUp(this.length - 1);
        }
        return this.length;
    }

    public shift(): T | undefined {
        if (this.length === 0) return undefined;
        if (this.length === 1) return this.#array.pop();

        const top = this.#array[0];
        this.#array[0] = this.#array.pop()!;
        this.bubbleDown(0);

        return top;
    }

    public remove(value: T): boolean {
        const index = this.#array.indexOf(value);
        if (index === -1) return false;

        const last = this.#array.pop()!;
        if (index < this.length) {
            this.#array[index] = last;
            this.bubbleDown(index);
            this.bubbleUp(index);
        }
        return true;
    }

    private bubbleUp(index: number): void {
        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            if (this.compareFn(this.#array[index], this.#array[parentIndex]) < 0) {
                this.swap(index, parentIndex);
                index = parentIndex;
            } else {
                break;
            }
        }
    }

    private bubbleDown(index: number): void {
        while (true) {
            let smallest = index;
            const left = 2 * index + 1;
            const right = 2 * index + 2;

            if (left < this.length && this.compareFn(this.#array[left], this.#array[smallest]) < 0) {
                smallest = left;
            }
            if (right < this.length && this.compareFn(this.#array[right], this.#array[smallest]) < 0) {
                smallest = right;
            }

            if (smallest !== index) {
                this.swap(index, smallest);
                index = smallest;
            } else {
                break;
            }
        }
    }

    private swap(i: number, j: number): void {
        [this.#array[i], this.#array[j]] = [this.#array[j], this.#array[i]];
    }

    public *values(): IterableIterator<T> {
        const clone = new BinaryHeap(this.compareFn, this);
        let curr: T | undefined;
        while (curr = clone.shift())
            yield curr;
    }

    public *keys(): IterableIterator<number> {
        for (let i = 0; i < this.length; i++)
            yield i;
    }

    public *entries(): IterableIterator<[number, T]> {
        const clone = new BinaryHeap(this.compareFn, this);
        let index = 0;
        let curr: T | undefined;
        while (curr = clone.shift())
            yield [index++, curr];
    }

    [Symbol.iterator](): IterableIterator<T> {
        return this.values();
    }
}

class QueueNode {
    constructor(public priority: number) { }
}

export class PriorityQueue<T> implements Queue<T> {
    #data = new WeakMap<object, T>();
    #nodes = new HashMap<T, LinkedList<QueueNode>>();
    #heap = new BinaryHeap<QueueNode>((a, b) => b.priority - a.priority);

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
        const node = new QueueNode(priority);
        this.#data.set(node, item);

        const nodes = this.#nodes.get(item) ?? new LinkedList<QueueNode>();
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
        this.#heap = new BinaryHeap<QueueNode>((a, b) => b.priority - a.priority);
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
    public find<S extends T>(predicate: (value: T, priority: number, obj: PriorityQueue<T>) => value is S): S | undefined {
        for (const [prio, val] of this.entries()) {
            if (predicate(val, prio, this)) return val;
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
    public findLast<S extends T>(predicate: (value: T, priority: number, obj: PriorityQueue<T>) => value is S): S | undefined {
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
    public filter<S extends T>(predicate: (value: T, priority: number, obj: PriorityQueue<T>) => value is S): PriorityQueue<S> {
        const newQueue = new PriorityQueue<S>();
        for (const [prio, val] of this.entries()) {
            if (predicate(val, prio, this)) newQueue.push(val, prio);
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