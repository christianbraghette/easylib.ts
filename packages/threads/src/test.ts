import { Worker } from 'worker_threads';
import path from 'path';

/**
 * Funzione helper per eseguire logica in un worker
 */
function runInWorker(fn: Function, ...args: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
        const worker = new Worker(path.resolve(__dirname, 'worker-nodejs.js'));

        // Inviamo la funzione serializzata (.toString()) e gli argomenti
        worker.postMessage({
            task: fn.toString(),
            args: args
        });

        worker.on('message', (response) => {
            if (response.success) {
                resolve(response.result);
            } else {
                reject(new Error(response.error));
            }
            worker.terminate();
        });

        worker.on('error', reject);
        worker.on('exit', (code) => {
            if (code !== 0) reject(new Error(`Worker fermato con codice ${code}`));
        });
    });
}

// --- ESEMPIO DI UTILIZZO ---

const miaLogicaPesante = (a: number, b: number) => {
    // Simuliamo un calcolo intensivo
    const start = Date.now();
    while (Date.now() - start < 1000) { }
    return `Risultato: ${a + b}`;
};

async function main() {
    console.log("Inizio esecuzione nel worker...");
    try {
        const risultato = await runInWorker(miaLogicaPesante, 10, 20);
        console.log("Ricevuto dal worker:", risultato);
    } catch (err) {
        console.error("Errore nel worker:", err);
    }
}

main();