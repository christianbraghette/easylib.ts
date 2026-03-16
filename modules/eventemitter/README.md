# EventEmitter for TypeScript

A lightweight, type-safe, and async-ready EventEmitter for TypeScript.

Supports standard event subscriptions, one-time listeners, async `wait()` for events, and full cleanup with `destroy()`.

---

## Features

- Type-safe event identifiers and payloads
- Standard listeners with `on()`
- One-time listeners with `once()`
- Emit events with payloads using `emit()`
- Async waiting for an event with optional timeout using `wait()`
- Proper cleanup of listeners and pending waits via `destroy()`
- Prevents memory leaks by tracking active timers and pending promises

---

## Installation

If you're using npm:

```bash
npm install easyemitter.ts
```

Or with yarn:

```bash
yarn add easyemitter.ts
```

---

## Usage

```ts
import { EventEmitter } from "easyemitter.ts";

type Events = {
  message: { text: string; from: string };
  ready: void;
};

const emitter = new EventEmitter<Events>();

// Standard listener — callback receives (data, emitter)
emitter.on("message", (data, em) => {
  console.log("Message received:", data);
});

// One-time listener
emitter.once("ready", (_data, em) => {
  console.log("Emitter is ready!");
});

// Emit events
emitter.emit("message", { text: "Hello", from: "Alice" });
emitter.emit("ready");

// Wait asynchronously for an event
async function waitForMessage() {
  try {
    // `wait` resolves with the event payload or rejects with the string
    // "Event timed out" (on timeout) or "EventEmitter destroyed" (if emitter destroyed)
    const data = await emitter.wait("message", 5000); // 5 seconds timeout
    console.log("Received message via wait:", data);
  } catch (err) {
    console.error("Wait error:", err);
  }
}

waitForMessage();

// Destroy the emitter — rejects pending `wait()` promises
emitter.destroy();
```

---

## API Reference

### `on(type, callFn)`

Registers a listener for a given event key.

- `type` — the event key to listen for
- `callFn` — the callback invoked when the event is emitted; receives `(data, emitter)`

### `once(type, callFn)`

Registers a one-time listener that will be removed after being invoked once.

### `off(type, callFn)`

Removes a previously registered listener for the specified event key.

### `emit(type, data)`

Emits an event to all listeners registered for the given key.

- `data` is required and must match the type in `EventsMap` for the event key. For events typed as `void` or `undefined` omit the `data` argument.

Returns: `void`.

### `wait(type, timeout?)`

Returns a promise that resolves with the payload of the first event of the given key.

- `timeout` is optional (milliseconds). If the timeout elapses the returned promise rejects with the string "Event timed out". If `destroy()` is called while waiting the promise rejects with the string "EventEmitter destroyed".

Returns: `Promise<EventsMap[typeof type] | undefined>` — resolves with the emitted payload for the event key.

### `destroy()`

Cleans up all listeners, pending `wait()` promises, and active timeouts. All pending `wait()` promises are rejected with the string "EventEmitter destroyed".

---

## Notes

* Fully type-safe in TypeScript
* Designed to avoid memory leaks with timers and pending `wait()` calls
* `wait()` and `once()` can be used for async flow control

---

## License

GPL 3.0 License
