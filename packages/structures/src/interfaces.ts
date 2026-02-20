interface Collection<K, V> {
    keys(): IterableIterator<K>;
    values(): IterableIterator<V>;
    entries(): IterableIterator<[K, V]>;

    [Symbol.iterator](): IterableIterator<V | K | [K, V]>;
    [Symbol.toStringTag]: string;
}

export interface NonLinear<K, V> extends Collection<K, V> {
    readonly size: number

    has(key: K): boolean;
    delete(key: K): boolean;
    clear(): void;
}

export interface Linear<T> extends Collection<number, T> {
    readonly length: number;

    reverse(): this;
    fill(value: T): this;
    includes(searchElement: T): boolean;
    concat(...items: (T | ConcatArray<T>)[]): Linear<T>;
    join(separator?: string): string;
}

export interface Indexable<T> extends Linear<T> {
    at(index: number): T | undefined;
    fill(value: T, start?: number, end?: number): this;
    includes(searchElement: T, fromIndex?: number): boolean;
    indexOf(searchElement: T, fromIndex?: number): number;
    lastIndexOf(searchElement: T, fromIndex?: number): number;
    slice(start?: number, end?: number): Indexable<T>;
    splice(start: number, deleteCount?: number, ...items: T[]): Indexable<T>;
    copyWithin(target: number, start: number, end?: number): this;
}

export interface FIFO<T> {
    pop(): T | undefined;
    push(...items: T[]): number;
}

export interface RFIFO<T> {
    shift(): T | undefined;
    unshift(...items: T[]): number;
}

export interface LIFO<T> {
    shift(): T | undefined;
    push(...items: T[]): number;
}

export interface RLIFO<T> {
    pop(): T | undefined;
    unshift(...items: T[]): number;
}

export interface Functionals<K, V> {
    forEach(callbackfn: (value: V, key: K, obj: Collection<K, V>) => void): void;
    map<U>(callbackfn: (value: V, key: K, obj: Collection<K, V>) => U): Collection<K, U>;
    reduce<U>(callbackfn: (previousValue: U, currentValue: V, currentKey: K, obj: Collection<K, V>) => U, initialValue: U): U;
    every(predicate: (value: V, key: K, obj: Collection<K, V>) => unknown): boolean;
    some(predicate: (value: V, key: K, obj: Collection<K, V>) => unknown): boolean;
    filter<S extends V>(predicate: (value: V, key: K, obj: Collection<K, V>) => value is S): Collection<K, S>;
    find<S extends V>(predicate: (value: V, key: K, obj: Collection<K, V>) => value is S): S | undefined;
}

export interface LinearFunctionals<K, V> extends Functionals<K, V> {
    findLast<S extends V>(predicate: (value: V, index: K, obj: Collection<K, V>) => value is S): S | undefined;
    reduceRight<U>(callbackfn: (previousValue: U, currentValue: V, currentIndex: K, obj: Collection<K, V>) => U, initialValue: U): U;
    flat(depth?: number): Collection<K, V>;
    flatMap<U>(callbackfn: (value: V, index: K, obj: Collection<K, V>) => U | Array<U>): Collection<K, U>;
    sort(compareFn?: (a: V, b: V) => number): this;
}

export interface IndexableFunctionals<K, V> extends LinearFunctionals<K, V> {
    findIndex(predicate: (value: V, index: K, obj: Collection<K, V>) => unknown): number;
    findLastIndex(predicate: (value: V, index: K, obj: Collection<K, V>) => unknown): number;
}

export interface Stack<T> extends FIFO<T>, Linear<T>, LinearFunctionals<number, T> {
    first(): T | undefined;
}

export interface Queue<T> extends LIFO<T>, Linear<T>, LinearFunctionals<number, T> {
    first(): T | undefined;
}

export interface Deque<T> extends Queue<T>, RLIFO<T> {
    first(): T | undefined;
    last(): T | undefined;
}