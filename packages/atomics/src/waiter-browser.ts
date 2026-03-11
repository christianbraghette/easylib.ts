import { InputMessage } from "./types";

self.onmessage = (ev: MessageEvent<InputMessage>) => {
    const { buffer, index, value, timeout } = ev.data;
    const port = ev.ports[0];

    try {
        const array = new Int32Array(buffer);
        const status = Atomics.wait(array, index, value, timeout);
        port.postMessage({ status });
    } catch (error: any) {
        port.postMessage({ status: 'error', error: error.message });
    } finally {
        port.close();
    }
};