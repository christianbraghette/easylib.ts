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

import { FlattenStep } from ".";
import type { Pipeline } from "./pipeline";

export interface ConcatIterable<T> extends Iterable<T> {
    [Symbol.isConcatSpreadable]: boolean;
}

export abstract class Collection<K, V> {

    abstract clear(): void;

    abstract keys(): IterableIterator<K>;
    abstract values(): IterableIterator<V>;
    abstract entries(): IterableIterator<[K, V]>;

    abstract pipe(): Pipeline<V, 'sync'> | Pipeline<[K, V], 'sync'>;
    abstract pipe<U>(transformer: ((source: Pipeline<V, 'sync'>) => Pipeline<U, 'sync'>) | ((source: Pipeline<[K, V], 'sync'>) => Pipeline<[K, U], 'sync'>)): Collection<K, U>;

    abstract [Symbol.iterator](): IterableIterator<V> | IterableIterator<[K, V]>;
    abstract [Symbol.toStringTag]: string;

    toJSON(): [K, V][] | V[] {
        return [...this] as [K, V][] | V[];
    }

    get [Symbol.isConcatSpreadable](): boolean {
        return true;
    }
}

export function isCollection(obj: Object): boolean {
    return obj instanceof Collection;
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
    concat(...items: (T | ConcatIterable<T>)[]): Linear<K, T>;
    join(separator?: string): string;
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
    map<U>(callbackfn: (value: V, key: K, obj: Collection<K, V>) => U): Collection<K, U> | Collection<U, U>;
    reduce<U>(callbackfn: (previousValue: U, currentValue: V, currentKey: K, obj: Collection<K, V>) => U, initialValue: U): U;
    every(predicate: (value: V, key: K, obj: Collection<K, V>) => unknown): boolean;
    some(predicate: (value: V, key: K, obj: Collection<K, V>) => unknown): boolean;
    filter<S extends V>(predicate: (value: V, key: K, obj: Collection<K, V>) => unknown): any;
    find<S extends V>(predicate: (value: V, key: K, obj: Collection<K, V>) => unknown): S | undefined;
}

export interface LinearFunctionals<K, V> extends Functionals<K, V> {
    findLast<S extends V>(predicate: (value: V, key: K, obj: Linear<K, V>) => unknown): S | undefined;
    reduceRight<U>(callbackfn: (previousValue: U, currentValue: V, currentKey: K, obj: Linear<K, V>) => U, initialValue: U): U;
    flat<D extends number = 1>(depth?: D): Linear<K, FlattenStep<V, D>>;
    flatMap<U>(callbackfn: (value: V, key: K, obj: Linear<K, V>) => U | Iterable<U>): Linear<K, U>;
}

export interface IndexableFunctionals<V> extends LinearFunctionals<number, V> {
    findIndex(predicate: (value: V, index: number, obj: Indexable<V>) => unknown): number;
    findLastIndex(predicate: (value: V, index: number, obj: Indexable<V>) => unknown): number;
}

export interface Stack<T> extends LIFO<T>, Linear<number, T> {
    last(): T | undefined;
}

export interface Queue<T> extends FIFO<T>, Linear<number, T> {
    first(): T | undefined;
}

export interface Deque<T> extends Queue<T>, RLIFO<T> {
    first(): T | undefined;
    last(): T | undefined;
}

export interface List<T> extends FIFO<T>, RFIFO<T>, Indexable<T>, IndexableFunctionals<T> {
    push(...items: T[]): number;
    unshift(...items: T[]): number;

    [Symbol.iterator](): IterableIterator<T>;
}

export interface Map<K, V> extends NonLinear<K, V>, Functionals<K, V> {
    set(key: K, value: V): this;
    get(key: K): V | undefined;

    [Symbol.iterator](): IterableIterator<[K, V]>;
}

export interface Set<V> extends NonLinear<V, V>, Functionals<V, V> {
    add(value: V): this;

    union(other: Set<V>): Set<V>
    intersection(other: Set<V>): Set<V>
    difference(other: Set<V>): Set<V>
    isSubsetOf(other: Set<V>): boolean

    [Symbol.iterator](): IterableIterator<V>;
}