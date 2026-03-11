/**
 * Release a previously acquired permit back to the semaphore.
 */
export type ReleaseFunction = () => void;

/**
 * Represents Lock state and release methods
 * 
 * ⚠️ This is automatically provided by `acquire`.
 */
export interface Lock extends Disposable, AsyncDisposable {
    readonly locked: boolean;

    readonly release: ReleaseFunction;
}

export interface VarLock<T> extends Lock {
    value: T;
}

/**
 * Semaphore provides a synchronization primitive that controls access
 * to a finite number of resources (permits).
 */
export interface Semaphore {
    maxCount: number

    /**
     * Attempt to acquire the mutex.
     * - If the mutex is available, resolves immediately with a `release` function.
     * - Otherwise, the caller is enqueued until the mutex is released.
     *
     * Overload:
     * - `acquire(): Promise<ReleaseFunction>`
     * - `acquire(callback: (release: ReleaseFunction) => void): void`
     *
     * The returned `release` function **must** be called once the critical
     * section is finished to unblock the next waiting task.
     */
    acquire(): Promise<Lock>
    acquire(signal: AbortSignal): Promise<Lock>
    acquire(callbackfn: (release: ReleaseFunction) => void): void

    /**
     * Non-blocking version of acquire.
     * - Returns a `release` function if the mutex was available.
     * - Returns `undefined` if the mutex was already locked.
     *
     * Useful when you want to avoid queuing and only proceed if the lock
     * can be obtained immediately.
     */
    tryAcquire(): Lock | undefined;

    /**
     * Check if the mutex is currently locked.
     *
     * @returns `true` if the lock is held, `false` otherwise.
     */
    isLocked(): boolean;

    /**
     * Returns the number of tasks currently waiting in the queue.
     *
     * Useful for debugging or monitoring contention.
     */
    waitersCount(): number;

    /**
     * Forcefully resolves all pending acquisitions with a no-op release function.
     *
     * This effectively unblocks all waiting tasks but does not affect
     * the task that currently holds the lock.
     *
     * Commonly used during shutdown or emergency cleanup.
     */
    releaseAll(): void;

    /**
     * Forcefully rejects all pending acquisitions with reason `"reset"`,
     * and resets the internal state to unlocked.
     *
     * Useful for aborting all queued tasks when the system is shutting down
     * or recovering from an error.
     */
    reset(): void;

    /**
     * Execute a function.
     * - Acquires the lock.
     * - Runs the provided function `fn`.
     * - Releases the lock in a `finally` block to ensure it always unlocks.
     *
     * @param fn Async or sync function to execute exclusively.
     * @returns The result of `fn`.
     */
    run<T>(fn: () => Promise<T> | T): Promise<T>;

    /**
     * Execute a function exclusively with a timeout.
     * - If the lock is not acquired within the given timeout,
     *   rejects with `Error("Mutex timeout")`.
     * - Otherwise, behaves like `run`.
     *
     * @param fn Async or sync function to execute exclusively.
     * @param ms Timeout in milliseconds.
     * @returns The result of `fn`.
     */
    runWithTimeout<T>(fn: () => Promise<T> | T, ms: number): Promise<T>;
}

/**
 * Mutex provides a synchronization primitive to ensure
 * that only one asynchronous task can enter a critical section at a time.
 */
export interface Mutex extends Semaphore {
    readonly maxCount: 1;
}