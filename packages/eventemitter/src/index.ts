/**
 * Copyright 2025 Christian Braghette
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files 
 * (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, 
 * publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, 
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
 * DEALINGS IN THE SOFTWARE.
 */

/** */
type EventCallback<Event extends keyof EventsMap, EventsMap extends Record<string | number, any>> = (data: EventsMap[Event], emitter: EventEmitter<EventsMap>) => void;

/**
 * Lightweight EventEmitter implementation for TypeScript.
 *
 * This module exposes a small, type-safe event emitter that supports
 * standard subscriptions (`on`), one-time listeners (`once`), awaiting
 * an event (`wait`), emitting (`emit`), and full cleanup (`destroy`).
 *
 * Features:
 * - `on` to register persistent listeners
 * - `once` to register one-time listeners that auto-remove after firing
 * - `emit` to invoke all listeners for a given event key
 * - `wait` to asynchronously await the next occurrence of an event (with optional timeout)
 * - `destroy` to reject pending `wait()` promises, clear timers, and remove listeners
 *
 * Notes on types and behavior:
 * - `EventsMap` maps event keys to their payload types. For events with no payload use `void` or `undefined`.
 * - `emit` expects a payload matching the event's type.
 * - `wait` resolves with the emitted payload or rejects with the string "Event timed out" (on timeout) or "EventEmitter destroyed" (when destroyed).
 *
 * @template EventsMap The mapping of event keys to payload types.
 */
export class EventEmitter<EventsMap extends Record<string | number, any>> {
    // Holds reject functions for pending `wait()` promises so they can be rejected on destroy
    #waiters = new Set<(reason?: any) => void>()
    // Map from event key -> Set of listener callbacks
    #calls = new Map<keyof EventsMap, Set<EventCallback<any, EventsMap>>>();
    // Active timer IDs created by `wait()` so they can be cleared on destroy
    #timeouts = new Set<ReturnType<typeof setTimeout>>();

    /**
    * Registers a listener for a given event type.
    *
    * @param type The event key to listen for.
    * @param callbackFn The callback invoked with `(data, emitter)` when the event is emitted.
     */
    public on<Event extends keyof EventsMap>(type: Event, callbackFn: EventCallback<Event, EventsMap>): void {
        if (!this.#calls.has(type))
            this.#calls.set(type, new Set());
        this.#calls.get(type)?.add(callbackFn);
    }

    /**
    * Registers a one-time listener for a given event key.
    * The wrapper removes itself after the first invocation.
    *
    * @param type The event key to listen for once.
    * @param callbackFn The callback invoked once with `(data, emitter)`.
     */
    public once<Event extends keyof EventsMap>(type: Event, callbackFn: EventCallback<Event, EventsMap>): void {
        const wrapper: EventCallback<Event, EventsMap> = (event) => {
            callbackFn(event, this);
            this.off(type, wrapper);
        };
        this.on(type, wrapper);
    }

    /**
     * Removes a previously registered listener for the given event key.
     * If the callback is not present this is a no-op.
     *
     * @param type The event key whose listener should be removed.
     * @param callbackFn The callback function to unregister.
     */
    public off<Event extends keyof EventsMap>(type: Event, callbackFn: EventCallback<Event, EventsMap>): void {
        this.#calls.get(type)?.delete(callbackFn);
    }

    /**
     * Emits an event, invoking all listeners registered for that event key.
     *
     * The payload `data` must match the declared type in `EventsMap` for `type`.
     *
     * @param type The event key to emit.
     * @param data The payload associated with the event.
     */
    public emit<Event extends keyof EventsMap>(type: Event, data: EventsMap[Event]): void {
        for (const callFn of this.#calls.get(type) ?? [])
            callFn(data, this);
    }

    /**
     * Waits asynchronously for the next occurrence of the specified event key.
     *
     * If `timeout` (ms) is provided and elapses before the event, the returned promise rejects
     * with the string "Event timed out". If `destroy()` is called while waiting, the promise
     * rejects with the string "EventEmitter destroyed".
     *
     * @param type The event key to wait for.
     * @param timeout Optional timeout in milliseconds; when exceeded the promise rejects.
     * @returns A `Promise` that resolves with the emitted payload (type from `EventsMap`) or rejects with a string reason.
     */
    public wait<Event extends keyof EventsMap>(type: Event, timeout?: number): Promise<EventsMap[Event] | undefined> {
        return new Promise((resolve, reject) => {
            this.#waiters.add(reject);

            let t: ReturnType<typeof setTimeout> | undefined;
            if (timeout) {
                t = setTimeout(() => {
                    if (t !== undefined)
                        this.#timeouts.delete(t);
                    reject("Event timed out");
                }, timeout);
                this.#timeouts.add(t);
            }

            this.once<Event>(type, (data) => {
                clearTimeout(t);
                this.#waiters.delete(reject);
                resolve(data);
            });
        })
    }

    /**
     * Cleans up all active listeners, pending waits, and timeouts.
     *
     * All pending `wait()` promises are rejected with the string "EventEmitter destroyed".
     * All timers created by `wait()` are cleared, and all registered listeners are removed.
     */
    public destroy() {
        for (const reject of this.#waiters)
            reject("EventEmitter destroyed");
        for (const timeout of this.#timeouts)
            clearTimeout(timeout);
        for (const set of this.#calls)
            set[1].clear();
        this.#calls.clear();
    }

}

export default EventEmitter;