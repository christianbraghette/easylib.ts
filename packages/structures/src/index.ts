type NativeType = string | number | boolean | bigint;

const GC = new WeakMap<object, NativeType>();

class Native<T extends NativeType> {

    constructor(value: T) {
        GC.set(this, value);

        return new Proxy(this, {
            get(target, prop, receiver) {
                if (prop in target) {
                    return Reflect.get(target, prop, receiver);
                }

                const nativeValue = target.#value as any;
                if (typeof nativeValue[prop] === 'function') {
                    return nativeValue[prop].bind(nativeValue);
                }

                return nativeValue[prop];
            },
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

    public equals(other: T | Native<T>): boolean {
        return this.compare(other) === 0;
    }

    public clone(): Native<T> {
        return new Native(this.#value);
    }

    public toString(): string {
        return String(this.#value);
    }

    public valueOf(): T {
        return this.#value;
    }

    get [Symbol.toPrimitive]() {
        return (hint: 'string' | 'number' | 'default') => this.#value;
    }
}

const Box = <T extends NativeType>(v: T): Native<T> & T => new Native(v) as any;