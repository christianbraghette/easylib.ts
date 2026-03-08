import { ArrayList } from "./list";

export class BinaryHeap<T> {
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

    public clear(): void {
        this.#array.clear();
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