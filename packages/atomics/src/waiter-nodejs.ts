import { InputMessage } from "./types";

console.log("in worker");

/*(parentPort as MessagePort).onmessage = function (e: MessageEvent<InputMessage>) {
    const { buffer, index, value, timeout } = e.data;
    const int32 = new Int32Array(buffer);

    try {
        const result = Atomics.wait(int32, index, value, timeout);
        (parentPort as MessagePort).postMessage({ status: result, index: index });
    } catch (error) {
        (parentPort as MessagePort).postMessage({ status: 'error', error });
    }
};*/

import { parentPort } from 'worker_threads';

if (!parentPort) {
    throw new Error("Questo script deve essere eseguito come Worker thread.");
}

parentPort.on('message', (data: InputMessage) => {
    if (!parentPort) {
    throw new Error("Questo script deve essere eseguito come Worker thread.");
}
    // In Node.js, il MessagePort arriva spesso insieme ai dati 
    // se non usi il secondo argomento di postMessage per i transferables
    // Ma seguendo lo standard MessageChannel:
    console.log(data);
    const { buffer, index, value, timeout } = data;

    // Se passi la porta nei metadati (comune in Node) o via transferList
    const targetPort = parentPort;

    try {
        const array = new Int32Array(buffer);

        // Esegue l'attesa atomica (bloccante per questo worker)
        const status = Atomics.wait(array, index, value, timeout);

        targetPort.postMessage({ status });
    } catch (error: any) {
        targetPort.postMessage({ status: 'error', error: error.message });
    }
});