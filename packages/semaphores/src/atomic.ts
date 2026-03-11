import type { ReleaseFunction, Lock, Semaphore, Mutex } from "./interfaces";
import type { AtomicNumber } from "@easylib.ts/atomics";

export class AtomicSemaphore implements Semaphore {

    public constructor(private readonly count: AtomicNumber, private readonly waiters: AtomicNumber, private _maxCount: number, initialized = false) {
        if (count.MAX < _maxCount + 2)
            throw new Error("maxCount out of bound");
        if (!initialized) {
            this.count.set(_maxCount);
            this.waiters.set(0);
        }
    }

    public get maxCount(): number {
        return this._maxCount;
    }

    public set maxCount(count: number) {
        this.count.add(count - this.maxCount);
        this._maxCount = count;
    }

    public acquire(): Promise<Lock>
    public acquire(signal: AbortSignal): Promise<Lock>
    public acquire(callbackfn: (release: ReleaseFunction) => void): void
    public acquire(callbackfn?: ((release: ReleaseFunction) => void) | AbortSignal): Promise<Lock> | void {
        if (typeof callbackfn === 'function') {
            this.acquire().then((release) => {
                callbackfn(release.release);
                release.release();
            }).catch((error) => { throw error; });
            return;
        }
        return new Promise((resolve, reject) => {
            if (callbackfn instanceof AbortSignal) {
                if (callbackfn.aborted)
                    return reject(new Error("Acquire aborted"));

                callbackfn.addEventListener('abort', () => reject(new Error("Acquire aborted")), { once: true })
            }

            this.waiters.add();

            let lock: Lock | undefined;
            do
                lock = this.tryAcquire();
            while (!lock);

            this.waiters.sub();
            resolve(lock);
        });
    }

    private createLock(released = false): Lock {
        class LockConstructor implements Lock {
            #released: boolean;

            constructor(semaphore: AtomicSemaphore)
            constructor(semaphore?: AtomicSemaphore, released?: boolean)
            constructor(semaphore?: AtomicSemaphore, released: boolean = false) {
                this.#released = released;
                this.release = semaphore ? () => {
                    if (this.#released) return;
                    this.#released = true;
                    semaphore.count.add();
                } : () => {
                    if (this.#released) return;
                    this.#released = true;
                }
            }

            declare public readonly release: ReleaseFunction;

            public get locked() {
                return !this.#released;
            }

            [Symbol.dispose]() {
                this.release();
            }

            async [Symbol.asyncDispose]() {
                this.release();
            }

            public static released(): Lock {
                return new LockConstructor(undefined, true);
            }

        }

        if (released)
            return new LockConstructor(undefined, released);
        return new LockConstructor(this);
    }

    public tryAcquire(): Lock | undefined {
        if (this.count.sub() > 0)
            return this.createLock();
        this.count.add();
        return;
    }

    public isLocked(): boolean {
        return this.count.get() < 1;
    };

    public waitersCount(): number {
        return this._maxCount - this.count.get();
    }

    public releaseAll(): void {
        this.count.set(this._maxCount + 1);
        this.waiters.set(0);
    }

    public reset(): void {
        this.count.set(this._maxCount + 2);
        this.waiters.set(0);
    }

    public async run<T>(fn: () => Promise<T> | T): Promise<T> {
        const release = await this.acquire();
        try {
            return await fn()
        } finally {
            release.release();
        }
    }

    public async runWithTimeout<T>(fn: () => Promise<T> | T, ms: number): Promise<T> {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), ms);

        try {
            const lock = await this.acquire(controller.signal);
            try {
                return await fn();
            } finally {
                lock.release();
            }
        } catch (err) {
            if (err instanceof Error && err.message === "Acquire aborted") {
                throw new Error("Mutex timeout");
            }
            throw err;
        } finally {
            clearTimeout(timer);
        }
    }
}

export class AtomicMutex extends AtomicSemaphore implements Mutex {
    public constructor(count: AtomicNumber, waiters: AtomicNumber, initialized = false) {
        super(count, waiters, 1, initialized);
    }

    public accessor maxCount: 1 = 1;
}

export type * from "./interfaces";