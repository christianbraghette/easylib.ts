type NativeType = string | number | boolean | bigint;

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

const Box = <T extends NativeType>(v: T): Native<T> & T => new Native(v) as any;

export type Tuple<T extends any[]> = [...T];

export class IndexableIterable<T extends Record<string | number, any>> implements Iterable<T> {
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

export class CombinedIterable<T extends Tuple<any[]>> extends IndexableIterable<T> {
    constructor(...iterables: Iterable<T[keyof T]>[]) {
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