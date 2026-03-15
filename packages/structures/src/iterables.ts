import { Tuple } from ".";
import { LinkedList } from "./list";
import { Pipeline } from "./pipeline";

class IndexableIterable<T extends Record<string | number, any>> implements Iterable<T> {
    readonly [index: string | number]: IterableIterator<T[keyof T]>;
    #iterable: Iterable<T>;

    constructor(iterable: Iterable<T>) {
        this.#iterable = iterable;
        return new Proxy(this, {
            get: (target, prop, receiver) => {
                if (typeof prop === 'string') {
                    function* iterator() {
                        for (const entry of iterable)
                            yield entry[prop as string] as T[keyof T];
                    }
                    return iterator();
                }
                return Reflect.get(target, prop, receiver);
            }
        });
    }

    *[Symbol.iterator](): IterableIterator<T> {
        yield* this.#iterable;
    }
}

class CombinedIterable<T extends Tuple<any[]>> extends IndexableIterable<T> {
    constructor(iterables: Iterable<T[keyof T]>[]) {
        const iterators = iterables.map(val => val[Symbol.iterator]());

        function* iterator(): IterableIterator<T> {
            do {
                var res = iterators.map(val => val.next());
                yield res.map(val => !val.done ? val.value : undefined) as T;
            } while (res.every(val => val.done));
        }

        super(iterator());
    }
}

export class Iterables {
    public static *merge<S>(compareFn: (a: S, b: S) => number, ...iterables: Iterable<S>[]): IterableIterator<S> {
        const activeIterators = Pipeline.from(iterables)
            .map(it => it[Symbol.iterator]())
            .map(it => ({ it, next: it.next() }))
            .filter(res => !res.next.done)
            .collect(LinkedList.from);

        while (activeIterators.length > 0) {
            let minNode: {
                it: Iterator<S, any, any>;
                next: IteratorResult<S, any>;
            } | undefined = undefined;
            for (const activeIterator of activeIterators) {
                if (compareFn(activeIterator.next.value, (minNode?.next.value ?? Number.POSITIVE_INFINITY)) < 0) {
                    minNode = activeIterator;
                }
            }

            if (!minNode) throw new Error("Internal error")

            yield minNode.next.value;

            minNode.next = minNode.it.next();

            if (minNode.next.done) {
                activeIterators.remove(minNode);
            }
        }
    }

    public static *join<S>(...iterables: Iterable<S>[]): IterableIterator<S> {
        for (const iterable of iterables)
            yield* iterable;
    }

    public static index<S extends Record<string | number, any>>(iterable: Iterable<S>): IndexableIterable<S> {
        return new IndexableIterable(iterable);
    }

    public static combine<S extends Tuple<any[]>>(...iterables: Iterable<S[keyof S]>[]): CombinedIterable<S> {
        return new CombinedIterable(iterables);
    }

    public static iterator<S>(iterable: Iterable<S>) {
        return iterable[Symbol.iterator]();
    }
}

class AsyncIndexableIterable<T extends Record<string | number, any>> implements AsyncIterable<T> {
    readonly [index: string | number]: IterableIterator<T[keyof T]>;
    #iterable: AsyncIterable<T>;

    constructor(iterable: AsyncIterable<T>) {
        this.#iterable = iterable;
        return new Proxy(this, {
            get: (target, prop, receiver) => {
                if (typeof prop === 'string' && /^\d+$/.test(prop)) {
                    async function* iterator() {
                        for await (const entry of iterable)
                            yield entry[Number(prop)] as T[keyof T];
                    }
                    return iterator();
                }
                return Reflect.get(target, prop, receiver);
            }
        });
    }

    async *[Symbol.asyncIterator](): AsyncIterableIterator<T> {
        yield* this.#iterable;
    }
}

class AsyncCombinedIterable<T extends Tuple<any[]>> extends AsyncIndexableIterable<T> {
    constructor(iterables: AsyncIterable<T[keyof T]>[]) {
        const iterators = iterables.map(val => val[Symbol.asyncIterator]());

        async function* iterator(): AsyncIterableIterator<T> {
            do {
                var res = await Promise.all(iterators.map(val => val.next()));
                yield res.map(val => !val.done ? val.value : undefined) as T;
            } while (res.every(val => val.done));
        }

        super(iterator());
    }
}

export class AsyncIterables {
    public static async *join<S>(...iterables: AsyncIterable<S>[]): AsyncIterableIterator<S> {
        for await (const iterable of iterables)
            yield* iterable;
    }

    public static index<S extends Record<string | number, any>>(iterable: AsyncIterable<S>): AsyncIndexableIterable<S> {
        return new AsyncIndexableIterable(iterable);
    }

    public static combine<S extends Tuple<any[]>>(...iterables: AsyncIterable<S[keyof S]>[]): AsyncCombinedIterable<S> {
        return new AsyncCombinedIterable(iterables);
    }

    public static iterator<S>(iterable: AsyncIterable<S>) {
        return iterable[Symbol.asyncIterator]();
    }
}