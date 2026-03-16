export type Tuple<T extends any[]> = [...T];

type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, ...0[]];

export type FlattenStep<T, D extends number> =
    D extends 0
    ?
    T : T extends Iterable<infer U>
    ?
    T extends string
    ?
    T : FlattenStep<U, Prev[D]> : T;

export class Null {
    public static from<S>(iterable: Iterable<S>): null {
        for (const _ of iterable);
        return null;
    }
}

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
