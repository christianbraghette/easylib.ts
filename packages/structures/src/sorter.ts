import { BinaryHeap } from "./heap";
import { ArrayList, LinkedList } from "./list";
import { TreeSet } from "./set";

class SorterIterable<T> implements Iterable<T> {
    #getIterable: () => IterableIterator<T>;

    constructor(generator: () => IterableIterator<T>) {
        this.#getIterable = generator;
    }

    values(): IterableIterator<T> {
        return this.#getIterable();
    }

    [Symbol.iterator](): IterableIterator<T> {
        return this.#getIterable();
    }
}

export function timSort<T>(iterable: Iterable<T>, compareFn: (a: T, b: T) => number): SorterIterable<T> {
    const sorted = new ArrayList(iterable).sort(compareFn);
    return new SorterIterable(() => sorted.values())
}

export function mergeSort<T>(iterable: Iterable<T>, compareFn: (a: T, b: T) => number): SorterIterable<T> {
    const sorted = new LinkedList(iterable).sort(compareFn);
    return new SorterIterable(() => sorted.values());
}

export function heapSort<T>(iterable: Iterable<T>, compareFn: (a: T, b: T) => number): SorterIterable<T> {
    const sorted = new BinaryHeap(compareFn, iterable);
    return new SorterIterable(() => sorted.values());
}

export function treeSort<T>(iterable: Iterable<T>, compareFn: (a: T, b: T) => number): SorterIterable<T> {
    const sorted = new TreeSet(compareFn, iterable)
    return new SorterIterable(() => sorted.values());
}