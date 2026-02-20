import { Queue } from "./interfaces";
import { ArrayList } from "./lists";

/**
 * Interface for the Binary Heap iterator.
 * Extends IterableIterator to support for...of loops and manual iteration.
 */
interface BinaryHeapIterator<T> extends IterableIterator<T> { };

/**
 * A Binary Heap data structure implementation (Min-Heap or Max-Heap).
 * Elements are organized in a complete binary tree represented as a flat array.
 * @template T The type of elements held in the heap.
 */
export class BinaryHeap<T> { //implements Queue<T>
    /** Internal array storage for heap elements. */
    #heap = new ArrayList<T>();

    /**
     * Creates a new BinaryHeap instance.
     * @param compareFn Comparison function. Should return a negative number if 'a' has higher priority than 'b'.
     * @param initialData Optional array of elements to populate the heap initially.
     */
    constructor(private compareFn: (a: T, b: T) => number, initialData?: Iterable<T>) {
        if (initialData) {
            this.#heap = new ArrayList(initialData);
            this.buildHeap();
        }
    }

    /**
     * Returns the number of elements currently in the heap.
     * @returns The total count of elements.
     */
    public get length(): number {
        return this.#heap.length;
    }

    /**
     * Checks whether the heap contains any elements.
     * @returns True if the heap is empty, false otherwise.
     */
    public isEmpty(): boolean {
        return this.#heap.length === 0;
    }

    /**
     * Removes all elements from the heap.
     */
    public clear(): void {
        this.#heap = new ArrayList<T>();
    }

    /**
     * Retrieves, but does not remove, the element with the highest priority (the root).
     * @timeComplexity O(1)
     * @returns The top element, or undefined if the heap is empty.
     */
    public peek(): T | undefined {
        return this.#heap[0];
    }

    /**
     * Inserts a new value into the heap and re-balances to maintain heap property.
     * @timeComplexity O(log n)
     * @param value The element to be added.
     */
    public push(...items: T[]): number {
        for (const item of items) {
            this.#heap.push(item);
            this.bubbleUp(this.#heap.length - 1);
        }
        return this.length;
    }

    /**
     * Removes and returns the element with the highest priority.
     * @timeComplexity O(log n)
     * @returns The removed element, or undefined if the heap is empty.
     */
    public pop(): T | undefined {
        if (this.length === 0) return undefined;
        if (this.length === 1) return this.#heap.pop();

        const top = this.#heap[0];
        this.#heap.unshift(this.#heap.pop()!);
        this.bubbleDown(0);

        return top;
    }

    /**
     * Performs a linear search to find the first element matching the predicate.
     * @timeComplexity O(n)
     * @param predicate A function to test each element.
     * @returns The first matching element found, or undefined.
     */
    public find<S extends T>(predicate: (value: T, index: number, obj: BinaryHeap<T>) => value is S): S | undefined {
        return this.#heap.find((value, index) => predicate(value, index, this));
    }

    /**
     * Determines whether the heap contains a specific value.
     * @timeComplexity O(n)
     * @param value The element to search for.
     * @returns True if the element exists in the heap.
     */
    public includes(value: T): boolean {
        return this.#heap.includes(value);
    }

    /**
     * Removes a specific element from the heap and maintains structural integrity.
     * @timeComplexity O(n) to find the element, O(log n) to re-balance.
     * @param value The element to remove.
     * @returns True if the element was found and removed, false otherwise.
     */
    /*public remove(value: T): boolean {
        const index = this.#heap.indexOf(value);
        if (index === -1) return false;

        const lastIndex = this.length - 1;
        if (index === lastIndex) {
            this.#heap.pop();
        } else {
            this.#heap.splice(index, 0, this.#heap.pop()!);
            this.bubbleDown(index);
            this.bubbleUp(index);
        }
        return true;
    }*/

    /**
     * Returns a string representation of the internal heap array.
     * @returns A formatted string.
     */
    public toString(): string {
        return `BinaryHeap[${this.#heap.join(", ")}]`;
    }

    /**
     * Prints a visual tree representation of the heap to the console.
     * Useful for debugging structural properties.
     */
    /*public print(): void {
        if (this.isEmpty()) {
            console.log("Empty Heap");
            return;
        }
        const printNode = (index: number, prefix: string, isLeft: boolean) => {
            if (index < this.length) {
                console.log(`${prefix}${isLeft ? "├── " : "└── "}${this.#heap[index]}`);
                const newPrefix = prefix + (isLeft ? "│   " : "    ");
                printNode(2 * index + 1, newPrefix, true);
                printNode(2 * index + 2, newPrefix, false);
            }
        };
        printNode(0, "", false);
    }*/

    private buildHeap(): void {
        const lastParentIndex = Math.floor(this.#heap.length / 2 - 1);
        for (let i = lastParentIndex; i >= 0; i--) {
            this.bubbleDown(i);
        }
    }

    private bubbleUp(index: number): void {
        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            if (this.compareFn(this.#heap[index], this.#heap[parentIndex]) < 0) {
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

            if (left < this.length && this.compareFn(this.#heap[left], this.#heap[smallest]) < 0) {
                smallest = left;
            }
            if (right < this.length && this.compareFn(this.#heap[right], this.#heap[smallest]) < 0) {
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
        //this.#heap.splice(i)
        //[this.#heap[i], this.#heap[j]] = [this.#heap[j], this.#heap[i]];
    }

    /**
     * Creates an iterator that yields elements in order of priority (sorted).
     * @note This operation is non-destructive but requires O(n) space for cloning.
     * @timeComplexity O(n log n) for full iteration.
     * @yields Elements from highest to lowest priority.
     */
    public *values(): BinaryHeapIterator<T> {
        const clone = new BinaryHeap(this.compareFn, this.#heap);
        let curr: T | undefined;
        while (curr = clone.pop())
            yield curr;
    }

    public *keys(): BinaryHeapIterator<number> {
        for (let i = 0; i < this.length; i++)
            yield i;
    }

    public *entries(): BinaryHeapIterator<[number, T]> {
        const clone = new BinaryHeap(this.compareFn, this.#heap);
        let index = 0;
        let curr: T | undefined;
        while (curr = clone.pop())
            yield [index++, curr];
    }

    /**
     * Default iteration protocol. Allows the heap to be used in for...of loops.
     */
    public [Symbol.iterator](): BinaryHeapIterator<T> {
        return this.values();
    }

    public get [Symbol.toStringTag]() { return 'PriorityQueue'; }

    /**
     * Creates a new BinaryHeap instance from an existing array.
     * @template T The type of elements.
     * @param data The source array.
     * @param compareFn Comparison logic.
     * @timeComplexity O(n)
     * @returns A new heapified BinaryHeap instance.
     */
    public static heapify<T>(compareFn: (a: T, b: T) => number, data?: Iterable<T>): BinaryHeap<T> {
        return new BinaryHeap<T>(compareFn, data);
    }

    /**
     * Creates a deep copy of a given heap.
     * @template T The type of elements.
     * @param heap The heap instance to clone.
     * @returns A new BinaryHeap with the same elements and configuration.
     */
    /*public static clone<T>(heap: BinaryHeap<T>): BinaryHeap<T> {
        const newHeap = new BinaryHeap<T>(heap.compareFn);
        newHeap.#heap = [...heap.#heap];
        return newHeap;
    }*/

    /**
     * Sorts an array using the Heap Sort algorithm.
     * @template T The type of elements.
     * @param array The array to sort.
     * @param compareFn Comparison logic.
     * @timeComplexity O(n log n)
     * @returns A new sorted array.
     */
    public static heapSort<T>(array: T[], compareFn: (a: T, b: T) => number): T[] {
        return Array.from(BinaryHeap.heapify(compareFn, array).values());
    }
}