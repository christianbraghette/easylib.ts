export interface AtomicNumber {
    readonly MAX: number;
    readonly MIN: number;
    readonly byteLength: number

    /** Returns the value. Until this atomic operation completes, any other read or write operation against the array will block. */
    get(): number

    /** Stores a value, returning the new value. Until this atomic operation completes, any other read or write operation against the array will block. */
    set(value: number): number

    /** Adds a value to the value, returning the original value. Until this atomic operation completes, any other read or write operation against the array will block. */
    add(value?: number): number

    /** Subtracts a value from the value, returning the original value. Until this atomic operation completes, any other read or write operation against the array will block. */
    sub(value?: number): number

    /** Stores the bitwise AND of a value with the value, returning the original value. Until this atomic operation completes, any other read or write operation against the array will block. */
    and(value: number): number

    /** Stores the bitwise OR of a value with the value, returning the original value. Until this atomic operation completes, any other read or write operation against the array will block. */
    or(value: number): number

    /** Stores the bitwise XOR of a value with the value, returning the original value. Until this atomic operation completes, any other read or write operation against the array will block. */
    xor(value: number): number

    /** Replaces the value, returning the original value. Until this atomic operation completes, any other read or write operation against the array will block. */
    exchange(value: number): number

    /** Replaces the value if the original value equals the given expected value, returning the original value. Until this atomic operation completes, any other read or write operation against the array will block. */
    compareExchange(expectedValue: number, replacementValue: number): number

    /** Returns a value indicating whether high-performance algorithms can use atomic operations (true) or must use locks (false) for the given number of bytes-per-element of a typed array. */
    isLockFree(): boolean

    /** The ArrayBuffer instance referenced by the array. */
    readonly buffer: SharedArrayBuffer
}

type TypedArray = Int8Array | Int16Array | Int32Array | Uint8Array | Uint16Array | Uint32Array;

export abstract class AtomicInteger<T extends TypedArray> implements AtomicNumber {
    declare public readonly MAX: number;
    declare public readonly MIN: number;
    declare public readonly byteLength: number;

    public constructor(protected readonly array: T, protected readonly index: number) { }

    public get buffer(): SharedArrayBuffer {
        return this.array.buffer as SharedArrayBuffer;
    }

    public get(): number {
        return Atomics.load(this.array, this.index);
    }

    public set(value: number): number {
        if (!Number.isSafeInteger(value) || value > this.MAX || value < this.MIN)
            throw new Error("Value out of bound");
        return Atomics.store(this.array, this.index, value);
    }

    public add(value: number = 1): number {
        const old = Atomics.add(this.array, 0, value);
        if (!Number.isSafeInteger(value) || old + value > this.MAX) {
            Atomics.store(this.array, this.index, old);
            throw new Error("AtomicNumber out of bound")
        }
        return old;
    }

    public sub(value: number = 1): number {
        const old = Atomics.sub(this.array, this.index, value);
        if (!Number.isSafeInteger(value) || old - value < this.MIN) {
            Atomics.store(this.array, this.index, old);
            throw new Error("AtomicNumber out of bound")
        }
        return old;
    }

    public and(value: number): number {
        if (!Number.isSafeInteger(value))
            throw new Error("Value out of bound");
        return Atomics.and(this.array, this.index, value);
    }

    public or(value: number): number {
        if (!Number.isSafeInteger(value))
            throw new Error("Value out of bound");
        return Atomics.or(this.array, this.index, value);
    }

    public xor(value: number): number {
        if (!Number.isSafeInteger(value))
            throw new Error("Value out of bound");
        return Atomics.xor(this.array, this.index, value);
    }

    public exchange(value: number): number {
        if (!Number.isSafeInteger(value) || value > this.MAX || value < this.MIN)
            throw new Error("Value out of bound");
        return Atomics.exchange(this.array, this.index, value);
    }

    public compareExchange(expectedValue: number, replacementValue: number): number {
        if (!Number.isSafeInteger(expectedValue))
            throw new Error("ExpectedValue out of bound");
        if (!Number.isSafeInteger(replacementValue) || replacementValue > this.MAX || replacementValue < this.MIN)
            throw new Error("ReplacementValue out of bound");
        return Atomics.compareExchange(this.array, this.index, expectedValue, replacementValue);
    }

    public isLockFree(): boolean {
        return Atomics.isLockFree(this.byteLength);
    }

    public toString(): string {
        return `AtomicInteger(${this.get()})`;
    }

    public toJSON(): number {
        return this.get();
    }

    [Symbol.toStringTag] = "object AtomicInteger";
}

export class AtomicInt8 extends AtomicInteger<Int8Array> {
    public readonly MAX = 127;
    public readonly MIN = -128;
    public readonly byteLength = 1;

    public constructor(buffer?: SharedArrayBuffer, index = 0) {
        super(new Int8Array(buffer ?? new SharedArrayBuffer(1)), index);
    }
}

export class AtomicInt16 extends AtomicInteger<Int16Array> {
    public readonly MAX = 32767;
    public readonly MIN = -32768;
    public readonly byteLength = 2;

    public constructor(buffer?: SharedArrayBuffer, index = 0) {
        super(new Int16Array(buffer ?? new SharedArrayBuffer(2)), index);
    }
}

export class AtomicInt32 extends AtomicInteger<Int32Array> {
    public readonly MAX = 2147483647;
    public readonly MIN = -2147483648;
    public readonly byteLength = 4;

    public constructor(buffer?: SharedArrayBuffer, index = 0) {
        super(new Int32Array(buffer ?? new SharedArrayBuffer(4)), index);
    }

    public wait(value: number, timeout?: number): "ok" | "not-equal" | "timed-out" {
        return Atomics.wait(this.array, this.index, value, timeout);
    }

    /*public waitAsync(value: number, timeout?: number): Promise<void> {
        return new Promise((resolve, reject) => {
            const res = Atomics.wait(this.array, this.index, value, timeout);
            if (res === 'not-equal' || res === 'timed-out')
                reject(res);
            else
                resolve();
        });
    }*/

    public notify(count?: number): number {
        return Atomics.notify(this.array, this.index, count);
    }
}

export class AtomicUint8 extends AtomicInteger<Uint8Array> {
    public readonly MAX = 255;
    public readonly MIN = 0;
    public readonly byteLength = 1;

    public constructor(buffer?: SharedArrayBuffer, index = 0) {
        super(new Uint8Array(buffer ?? new SharedArrayBuffer(1)), index);
    }
}

export class AtomicUint16 extends AtomicInteger<Uint16Array> {
    public readonly MAX = 65535;
    public readonly MIN = 0;
    public readonly byteLength = 2;

    public constructor(buffer?: SharedArrayBuffer, index = 0) {
        super(new Uint16Array(buffer ?? new SharedArrayBuffer(2)), index);
    }
}

export class AtomicUint32 extends AtomicInteger<Uint32Array> {
    public readonly MAX = 4294967295;
    public readonly MIN = 0;
    public readonly byteLength = 4;

    public constructor(buffer?: SharedArrayBuffer, index = 0) {
        super(new Uint32Array(buffer ?? new SharedArrayBuffer(4)), index);
    }
}

function bitConvert(value: number): bigint
function bitConvert(value: bigint): number
function bitConvert(value: number | bigint): number | bigint {
    const buffer = new ArrayBuffer(8);
    const bigInt = new BigUint64Array(buffer);
    const float = new Float64Array(buffer);
    if (typeof value === 'bigint') {
        bigInt[0] = value;
        return float[0];
    }
    float[0] = value;
    return bigInt[0];
}

class AtomicNumberConstructor implements AtomicNumber {
    public readonly MAX = Number.MAX_VALUE;
    public readonly MIN = Number.MIN_VALUE;
    public readonly byteLength: number = 8;
    private readonly array!: BigUint64Array;

    public constructor(initialValue?: number)
    public constructor(buffer?: SharedArrayBuffer)
    public constructor(buffer?: SharedArrayBuffer, initialValue?: number)
    public constructor(arg?: number | SharedArrayBuffer, initialValue: number = 0) {
        if (arg instanceof SharedArrayBuffer)
            if (arg.byteLength > this.byteLength)
                this.array = new BigUint64Array(arg).fill(BigInt(initialValue));
            else
                new Error("SharedArrayBuffer too short");
        else
            this.array = new BigUint64Array(new SharedArrayBuffer(this.byteLength)).fill(BigInt(arg ?? 0));
    }

    public get buffer(): SharedArrayBuffer {
        return this.array.buffer as SharedArrayBuffer;
    }

    public get(): number {
        return bitConvert(Atomics.load(this.array, 0));
    }

    public set(value: number): number {
        if (value > this.MAX || value < this.MIN)
            throw new Error("Value out of bound");
        return bitConvert(Atomics.store(this.array, 0, bitConvert(value)));
    }

    public add(value: number = 1): number {
        const old = bitConvert(Atomics.add(this.array, 0, bitConvert(value)));
        if (old + value > this.MAX) {
            Atomics.store(this.array, 0, bitConvert(old));
            throw new Error("AtomicNumber out of bound")
        }
        return old;
    }

    public sub(value: number = 1): number {
        const old = bitConvert(Atomics.sub(this.array, 0, bitConvert(value)));
        if (old - value < this.MIN) {
            Atomics.store(this.array, 0, bitConvert(old));
            throw new Error("AtomicNumber out of bound")
        }
        return old;
    }

    public and(value: number): number {
        return bitConvert(Atomics.and(this.array, 0, bitConvert(value)));
    }

    public or(value: number): number {
        return bitConvert(Atomics.or(this.array, 0, bitConvert(value)));
    }

    public xor(value: number): number {
        return bitConvert(Atomics.xor(this.array, 0, bitConvert(value)));
    }

    public exchange(value: number): number {
        if (value > this.MAX || value < this.MIN)
            throw new Error("Value out of bound");
        return bitConvert(Atomics.exchange(this.array, 0, bitConvert(value)));
    }

    public compareExchange(expectedValue: number, replacementValue: number): number {
        if (replacementValue > this.MAX || replacementValue < this.MIN)
            throw new Error("ReplacementValue out of bound");
        return bitConvert(Atomics.compareExchange(this.array, 0, bitConvert(expectedValue), bitConvert(replacementValue)));
    }

    public isLockFree(): boolean {
        return Atomics.isLockFree(this.byteLength);
    }

    public toString(): string {
        return `AtomicNumber(${this.get()})`;
    }

    public toJSON(): number {
        return this.get();
    }

    [Symbol.toStringTag] = "object AtomicNumber";
}

export class AtomicNumber {
    public constructor(initialValue?: number)
    public constructor(buffer?: SharedArrayBuffer)
    public constructor(buffer?: SharedArrayBuffer, initialValue?: number)
    public constructor(arg?: number | SharedArrayBuffer, initialValue?: number) {
        return new Proxy(new AtomicNumberConstructor(arg as any, initialValue), {})
    }
}