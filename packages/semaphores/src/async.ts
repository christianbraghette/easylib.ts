import { ReleaseFunction, VarLock, Lock, Semaphore } from "./interfaces";

export class AsyncSemaphore implements Semaphore {
    private count: number;
    private readonly queue = new Array<{ resolve: (release: Lock) => void, reject: (reason: 'reset' | 'error') => void }>();

    public constructor(private _maxCount: number) {
        this.count = _maxCount;
    }

    public get maxCount(): number {
        return this._maxCount;
    }

    public set maxCount(count: number) {
        this.count += count - this.maxCount;
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
        if (this.count-- > 0)
            return Promise.resolve(this.createLock());
        return new Promise((resolve, reject) => {
            const entry = { resolve, reject };

            if (callbackfn instanceof AbortSignal) {
                if (callbackfn.aborted)
                    return reject(new Error("Acquire aborted"));

                let handler = () => {
                    const index = this.queue.indexOf(entry);
                    if (index > -1)
                        this.queue.splice(index, 1);
                    reject(new Error("Acquire aborted"));
                }

                callbackfn.addEventListener('abort', handler, { once: true })
            }

            this.queue.push(entry);
        });
    }

    private createLock(released = false): Lock {
        class LockConstructor implements Lock {
            #released: boolean;

            constructor(semaphore: AsyncSemaphore)
            constructor(semaphore?: AsyncSemaphore, released?: boolean)
            constructor(semaphore?: AsyncSemaphore, released: boolean = false) {
                this.#released = released;
                this.release = semaphore ? () => {
                    if (this.#released) return;
                    this.#released = true;
                    if (semaphore.count++ < 0)
                        semaphore.queue.shift()?.resolve(semaphore.createLock());
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
        if (this.count-- > 0)
            return this.createLock();
        this.count++;
        return;
    }

    public isLocked(): boolean {
        return this.count < 1;
    };

    public waitersCount(): number {
        return this.queue.length;
    }

    public releaseAll(): void {
        while (this.queue.length > 0)
            this.queue.shift()?.resolve(this.createLock(true));
        this.count = this._maxCount;
    }

    public reset(): void {
        while (this.queue.length > 0)
            this.queue.shift()?.reject('reset');
        this.count = this._maxCount;
    }

    public async run<T>(fn: () => Promise<T> | T): Promise<T> {
        using release = await this.acquire();
        return await fn();
    }

    public async runWithTimeout<T>(fn: () => Promise<T> | T, ms: number): Promise<T> {
        // Creiamo un AbortController per gestire il timeout
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), ms);

        try {
            using lock = await this.acquire(controller.signal);
            return await fn();
        } catch (err) {
            if (err instanceof Error && err.message === "Acquire aborted") {
                throw new Error("Mutex timeout");
            }
            throw err; // qualsiasi altro errore viene propagato
        } finally {
            clearTimeout(timer);
        }
    }
}

export class AsyncMutex extends AsyncSemaphore {
    public constructor() {
        super(1);
    }

    public accessor maxCount = 1;
}

export class AsyncLocker<T> extends AsyncSemaphore {
    #value: T;

    constructor(value: T)
    constructor(value: T, maxCount?: number)
    constructor(value: T, maxCount = 1) {
        super(maxCount);
        this.#value = value;
    }

    public async acquire(): Promise<VarLock<T>> {
        const lock = await super.acquire()
        if (!lock.locked)
            throw new Error("Lock not locking");
        return this.createVarLock(lock);
    }

    private createVarLock(lock: Lock) {
        class VarLockConstructor<T> implements VarLock<T> {
            #locker: AsyncLocker<T>;

            constructor(locker: AsyncLocker<T>, private readonly lock: Lock) {
                this.#locker = locker;
                this.release = this.lock.release;
            }

            public get value() {
                return this.#locker.#value;
            }

            public set value(value: T) {
                this.#locker.#value = value;
            }

            public get locked(): boolean {
                return this.lock.locked;
            }

            public release: ReleaseFunction;

            [Symbol.dispose](): void {
                this.lock.release();
            }

            async [Symbol.asyncDispose](): Promise<void> {
                this.lock.release();
            }

        }

        return new VarLockConstructor(this, lock);
    }
}

export * from "./interfaces";