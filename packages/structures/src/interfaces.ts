import type { Pipeline } from "./pipeline";

type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, ...0[]];

export type FlattenStep<T, D extends number> =
    D extends 0
    ?
    T : T extends Iterable<infer U>
    ?
    T extends string
    ?
    T : FlattenStep<U, Prev[D]> : T;

export interface Collection<K, V> {
    clear(): void;

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

export interface LIFO<T> {
    pop(): T | undefined;
    push(item: T): number;
}

export interface RLIFO<T> {
    shift(): T | undefined;
    unshift(item: T): number;
}

export interface FIFO<T> {
    shift(): T | undefined;
    push(item: T): number;
}

export interface RFIFO<T> {
    pop(): T | undefined;
    unshift(item: T): number;
}

export interface Functionals<K, V> {
    forEach(callbackfn: (value: V, key: K, obj: Collection<K, V>) => void): void;
    map<U>(callbackfn: (value: V, key: K, obj: Collection<K, V>) => U): Collection<K | U, U>;
    reduce<U>(callbackfn: (previousValue: U, currentValue: V, currentKey: K, obj: Collection<K, V>) => U, initialValue: U): U;
    every(predicate: (value: V, key: K, obj: Collection<K, V>) => boolean | undefined | null): boolean;
    some(predicate: (value: V, key: K, obj: Collection<K, V>) => boolean | undefined | null): boolean;
    filter<S extends V>(predicate: (value: V, key: K, obj: Collection<K, V>) => boolean | undefined | null): Collection<K, S>;
    filter(predicate: (value: V, key: K, obj: Collection<K, V>) => boolean | undefined | null): Collection<K, V>;
    find<S extends V>(predicate: (value: V, key: K, obj: Collection<K, V>) => boolean | undefined | null): S | undefined;
}

export interface LinearFunctionals<K, V> extends Functionals<K, V> {
    map<U>(callbackfn: (value: V, key: K, obj: Collection<K, V>) => U): Linear<K, U>;
    findLast<S extends V>(predicate: (value: V, key: K, obj: Linear<K, V>) => boolean | undefined | null): S | undefined;
    reduceRight<U>(callbackfn: (previousValue: U, currentValue: V, currentKey: K, obj: Linear<K, V>) => U, initialValue: U): U;
    flat<D extends number = 1>(depth?: D): Linear<K, FlattenStep<V, D>>;
    flatMap<U>(callbackfn: (value: V, key: K, obj: Linear<K, V>) => U | Iterable<U>): Linear<K, U>;
}

export interface IndexableFunctionals<V> extends LinearFunctionals<number, V> {
    findIndex(predicate: (value: V, index: number, obj: Indexable<V>) => boolean | undefined | null): number;
    findLastIndex(predicate: (value: V, index: number, obj: Indexable<V>) => boolean | undefined | null): number;
}

export interface VectorizedEntries<K, V> {
    pipe<U>(transformer: (source: Pipeline<[K, V]>) => Pipeline<[K, U]>): Collection<K, U>;
    stream(): Pipeline<[K, V]>;
}

export interface VectorizedValues<V> {
    pipe<U>(transformer: (source: Pipeline<V>) => Pipeline<U>): Collection<any, U>;
    stream(): Pipeline<V>;
}

export interface Stack<T> extends LIFO<T>, Linear<any, T> {
    last(): T | undefined;
}

export interface Queue<T> extends FIFO<T>, Linear<any, T> {
    first(): T | undefined;
}

export interface Deque<T> extends Queue<T>, RLIFO<T> {
    first(): T | undefined;
    last(): T | undefined;
}

export interface List<T> extends FIFO<T>, RFIFO<T>, Indexable<T>, IndexableFunctionals<T>, VectorizedValues<T> {
    push(...items: T[]): number;
    unshift(...items: T[]): number;
}

export interface Map<K, V> extends NonLinear<K, V>, Functionals<K, V>, VectorizedEntries<K, V> {
    set(key: K, value: V): this;
    get(key: K): V | undefined;

    map<U>(callbackfn: (value: V, key: K, obj: Map<K, V>) => U): Map<K, U>;

    [Symbol.iterator](): IterableIterator<[K, V]>;
}

export interface Set<V> extends NonLinear<V, V>, Functionals<V, V>, VectorizedValues<V> {
    add(value: V): this;

    union(other: Set<V>): Set<V>
    intersection(other: Set<V>): Set<V>
    difference(other: Set<V>): Set<V>
    isSubsetOf(other: Set<V>): boolean

    map<U>(callbackfn: (value: V, key: V, obj: Set<V>) => U): Set<U>;
    filter<S extends V>(predicate: (value: V, key: V, obj: Set<V>) => boolean | undefined | null): Set<S>;

    [Symbol.iterator](): IterableIterator<V>;
}

export interface SortedSet<V> extends Set<V> {
    map<U>(callbackfn: (value: V, key: V, obj: SortedSet<V>) => U, newCompareFn?: (a: U, b: U) => number): SortedSet<U>;
}