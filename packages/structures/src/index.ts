export type Tuple<T extends any[]> = [...T];

class IndexableIterable<T extends Record<string | number, any>> implements Iterable<T> {
    readonly [index: string | number]: IterableIterator<T[keyof T]>;
    #iterable: Iterable<T>;

    constructor(iterable: Iterable<T>) {
        this.#iterable = iterable;
        return new Proxy(this, {
            get: (target, prop, receiver) => {
                if (typeof prop === 'string' && /^\d+$/.test(prop)) {
                    function* iterator() {
                        for (const entry of iterable)
                            yield entry[Number(prop)] as T[keyof T];
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

    public static iterator<S>(iterable: Iterable<S>) {
        return iterable[Symbol.iterator]();
    }
}


/*class BetterIterator<T, TReturn = any, TNext = any> implements Iterator<T, TReturn, TNext> {

    constructor(
        nextFn: (...[value]: [] | [TNext]) => IteratorResult<T, TReturn>,
        returnFn?: (value?: TReturn | undefined) => IteratorResult<T, TReturn>,
        throwFn?: (e?: any) => IteratorResult<T, TReturn>
    ) {
        this.next = nextFn;
        this.return = returnFn;
        this.throw = throwFn;
    }

    public readonly next: (...[value]: [] | [TNext]) => IteratorResult<T, TReturn>;
    public readonly return?: (value?: TReturn | undefined) => IteratorResult<T, TReturn>;
    public readonly throw?: (e?: any) => IteratorResult<T, TReturn>;

    public static from<T, TR = any, TN = any>(iterable: Iterable<T>): Iterator<T, TR, TN> {
        return iterable[Symbol.iterator]();
    }
}

export { BetterIterator as Iterator };*/

export * from "./interfaces";

/*type NativeType = string | number | boolean | bigint;

const GC = new WeakMap<object, NativeType>();
const HC = new WeakMap<object, string>();

class Native<T extends NativeType> {

    constructor(value: T, hashCode?: string) {
        GC.set(this, value);
        HC.set(this, hashCode ?? crypto.randomUUID().split('-').join(''));

        return new Proxy(this, {
            get(target, prop, receiver) {
                const nativeValue = target.#value as any;
                if (typeof nativeValue[prop] === 'function') {
                    return nativeValue[prop].bind(nativeValue);
                }

                if (prop in target) {
                    return Reflect.get(target, prop, receiver);
                }

                return nativeValue[prop];
            }
        });
    }

    get #value(): T {
        return GC.get(this) as T;
    }

    public compare(other: T | Native<T>): number {
        const otherVal = other instanceof Native ? GC.get(other) : other;

        if (this.#value === otherVal) return 0;
        return this.#value > (otherVal as any) ? 1 : -1;
    }

    public clone(): Native<T> {
        return new Native(this.#value, this.hashCode());
    }

    public equals<T extends object>(other: T): boolean {
        return other && this.hashCode() === (other as any).hashCode();
    }

    public hashCode(): string {
        return HC.get(this)!;
    }

    public valueOf(): T {
        return this.#value;
    }

    [Symbol.toPrimitive] = (hint: 'string' | 'number' | 'default') => this.#value;
}

const Box = <T extends NativeType>(v: T): Native<T> & T => new Native(v) as any;*/
