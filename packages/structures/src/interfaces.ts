export interface Collection<K, V> {
    keys(): IterableIterator<K>;
    values(): IterableIterator<V>;
    entries(): IterableIterator<[K, V]>;

    [Symbol.iterator](): IterableIterator<[K, V] | V>;
    [Symbol.toStringTag]: string;
}

export interface NonLinear<K, V> extends Collection<K, V> {
    readonly size: number

    has(key: K): boolean;
    delete(key: K): boolean;
    clear(): void;
}

export interface Linear<K, T> extends Collection<K, T> {
    readonly length: number;

    fill(value: T): this;
    includes(searchElement: T): boolean;
    remove(value: T): boolean;
    concat(...items: (T | Iterable<T>)[]): Linear<K, T>;
    join(separator?: string): string;

    [Symbol.iterator](): IterableIterator<T>;
}

export interface Indexable<T> extends Linear<number, T> {
    at(index: number): T | undefined;
    reverse(): this;
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
    push(item: T): number;
}

export interface RFIFO<T> {
    shift(): T | undefined;
    unshift(item: T): number;
}

export interface LIFO<T> {
    shift(): T | undefined;
    push(item: T): number;
}

export interface RLIFO<T> {
    pop(): T | undefined;
    unshift(item: T): number;
}

export interface Functionals<K, V> {
    forEach(callbackfn: (value: V, key: K, obj: Collection<K, V>) => void): void;
    map<U>(callbackfn: (value: V, key: K, obj: Collection<K, V>) => U): Collection<K | U, U>;
    reduce<U>(callbackfn: (previousValue: U, currentValue: V, currentKey: K, obj: Collection<K, V>) => U, initialValue: U): U;
    every(predicate: (value: V, key: K, obj: Collection<K, V>) => boolean | undefined | null): boolean;
    some(predicate: (value: V, key: K, obj: Collection<K, V>) => boolean | undefined | null): boolean;
    filter<S extends V>(predicate: (value: V, key: K, obj: Collection<K, V>) => value is S): Collection<K, S>;
    find<S extends V>(predicate: (value: V, key: K, obj: Collection<K, V>) => value is S): S | undefined;
}

export interface LinearFunctionals<K, V> extends Functionals<K, V> {
    map<U>(callbackfn: (value: V, key: K, obj: Collection<K, V>) => U): Linear<K, U>;
    findLast<S extends V>(predicate: (value: V, key: K, obj: Linear<K, V>) => value is S): S | undefined;
    reduceRight<U>(callbackfn: (previousValue: U, currentValue: V, currentKey: K, obj: Linear<K, V>) => U, initialValue: U): U;
    flat<S>(depth?: number): Linear<K, S>;
    flatMap<U>(callbackfn: (value: V, key: K, obj: Linear<K, V>) => U | Iterable<U>): Linear<K, U>;
}

export interface IndexableFunctionals<V> extends LinearFunctionals<number, V> {
    sort(compareFn: (a: V, b: V) => number): this;
    findIndex(predicate: (value: V, index: number, obj: Indexable<V>) => boolean | undefined | null): number;
    findLastIndex(predicate: (value: V, index: number, obj: Indexable<V>) => boolean | undefined | null): number;
}

export interface Stack<T> extends FIFO<T>, Linear<any, T>, LinearFunctionals<any, T> {
    first(): T | undefined;
}

export interface Queue<T> extends LIFO<T>, Linear<any, T>, LinearFunctionals<any, T> {
    first(): T | undefined;
}

export interface Deque<T> extends Queue<T>, RLIFO<T> {
    first(): T | undefined;
    last(): T | undefined;
}

export interface List<T> extends FIFO<T>, RFIFO<T>, Indexable<T>, IndexableFunctionals<T> {
    push(...items: T[]): number;
    unshift(...items: T[]): number;
}

export interface Map<K, V> extends NonLinear<K, V>, Functionals<K, V> {
    set(key: K, value: V): this;
    get(key: K): V | undefined;

    map<U>(callbackfn: (value: V, key: K, obj: Map<K, V>) => U): Map<K, U>;

    [Symbol.iterator](): IterableIterator<[K, V]>;
}

export interface Set<V> extends NonLinear<V, V>, Functionals<V, V> {
    add(value: V): this;

    union(other: Iterable<V>): Set<V>
    intersection(other: Set<V>): Set<V>
    difference(other: Set<V>): Set<V>
    isSubsetOf(other: Set<V>): boolean

    map<U>(callbackfn: (value: V, key: V, obj: Set<V>) => U): Set<U>;

    [Symbol.iterator](): IterableIterator<V>;
}

export interface SortedSet<V> extends Set<V> {
    map<U>(callbackfn: (value: V, key: V, obj: SortedSet<V>) => U, newCompareFn?: (a: U, b: U) => -1 | 0 | 1): SortedSet<U>;
}