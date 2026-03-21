export namespace Bool {
    export function not(...args: any[]): boolean | boolean[] {
        if (args.length > 1)
            return args.map(arg => !arg);
        return !args[0];
    }

    export function and(arg1: any, arg2: any, ...args: any[]): boolean
    export function and(...args: any[]): boolean {
        return args.every(arg => !!arg);
    }

    export function or(...args: any[]): (...args2: any[]) => boolean {
        return (...args2: any[]): boolean => { console.log([...args, ...args2]); return [...args, ...args2].some(arg => !!arg)};
    }

    export function isNa(value: any): boolean {
        return value === undefined || value === null || (typeof value === 'number' && isNaN(value));
    }

    export function isNotNa(value: any): boolean {
        return !isNa(value);
    }
}

export namespace Val {
    export function notNull<T>(value: T): NonNullable<T> {
        if (value === undefined || value === null)
            throw new Error("Value: " + value)
        return value;
    }

    export function isBigint(value: any): value is bigint {
        return typeof value === 'bigint';
    }

    export function isBoolean(value: any): value is boolean {
        return typeof value === 'boolean';
    }

    export function isFunction(value: any): value is Function {
        return typeof value === 'function';
    }

    export function isNumber(value: any): value is number {
        return typeof value === 'number';
    }

    export function isObject(value: any): value is object {
        return value !== null && typeof value === 'object';
    }

    export function isString(value: any): value is string {
        return typeof value === 'string';
    }

    export function isSymbol(value: any): value is symbol {
        return typeof value === 'symbol';
    }

    export function isUndefined(value: any): value is undefined {
        return typeof value === 'undefined';
    }
}

export function restrict(length: number, offset: number = 0) {
    return <T>(...args: T[]): T[] => args.slice(offset, offset + length);
}

export function compose<A extends any[], R>(f1: (...args: A) => R): (...args: A) => R;
export function compose<A extends any[], B, R>(f1: (b: B) => R, f2: (...args: A) => B): (...args: A) => R;
export function compose<A extends any[], B, C, R>(f1: (c: C) => R, f2: (b: B) => C, f3: (...args: A) => B): (...args: A) => R;
export function compose<A extends any[], B, C, D, R>(f1: (d: D) => R, f2: (c: C) => D, f3: (b: B) => C, f4: (...args: A) => B): (...args: A) => R;
export function compose<A extends any[], B, C, D, E, R>(f1: (e: E) => R, f2: (d: D) => E, f3: (c: C) => D, f4: (b: B) => C, f5: (...args: A) => B): (...args: A) => R;
export function compose<A extends any[], B, C, D, E, F, R>(f1: (f: F) => R, f2: (e: E) => F, f3: (d: D) => E, f4: (c: C) => D, f5: (b: B) => C, f6: (...args: A) => B): (...args: A) => R;
export function compose(...funcs: Function[]): Function;
export function compose(...funcs: Function[]): Function {
    return (...args: any[]) => {
        return funcs.reduceRight((acc, fn, index) => {
            return index === funcs.length - 1 ? fn(...acc) : fn(acc);
        }, args);
    };
}

export function combine<A extends any[], R>(f1: (...args: A) => R): (...args: A) => R;
export function combine<A extends any[], B, R>(f1: (...args: A) => B, f2: (b: B) => R): (...args: A) => R;
export function combine<A extends any[], B, C, R>(f1: (...args: A) => B, f2: (b: B) => C, f3: (c: C) => R): (...args: A) => R;
export function combine<A extends any[], B, C, D, R>(f1: (...args: A) => B, f2: (b: B) => C, f3: (c: C) => D, f4: (d: D) => R): (...args: A) => R;
export function combine<A extends any[], B, C, D, E, R>(f1: (...args: A) => B, f2: (b: B) => C, f3: (c: C) => D, f4: (d: D) => E, f5: (e: E) => R): (...args: A) => R;
export function combine<A extends any[], B, C, D, E, F, R>(f1: (...args: A) => B, f2: (b: B) => C, f3: (c: C) => D, f4: (d: D) => E, f5: (e: E) => F, f6: (f: F) => R): (...args: A) => R;
export function combine(...funcs: Function[]): Function;
export function combine(...funcs: Function[]): Function {
    return (...args: any[]) => {
        return funcs.reduce((acc, fn, index) => {
            return index === funcs.length - 1 ? fn(...acc) : fn(acc);
        }, args);
    };
}