import { parentPort } from 'worker_threads';
import { SerializedFunction } from './types';

parentPort?.on('message', async (data: SerializedFunction) => {
    try {
        const AsyncFunction: FunctionConstructor = Object.getPrototypeOf(async function () { }).constructor;
        const fn = new AsyncFunction(`return (${data.task}).apply(null, arguments)`);

        // Esegue la funzione con gli argomenti forniti
        const result = await fn.bind({})(...data.args);

        // Invia il risultato al main thread
        parentPort?.postMessage({ success: true, result });
    } catch (error: any) {
        parentPort?.postMessage({ success: false, error: error.message });
    }
});