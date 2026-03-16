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