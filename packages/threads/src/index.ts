import { Worker } from 'worker_threads';
import path from 'path';

import { EventEmitter } from "@easylib.ts/eventemitter"
import { SerializedFunction } from './types';

class ThreadsPool {

}

type Tuple<T extends any[]> = [...T];

class Threads {
    public create<T extends Tuple<any>, S>(task: (...args: T) => S, args: T, context?: Object): Thread<T, S> {
        return new Thread<T, S>(task, args);
    }
}

type EventsMap<Success> = {
    start: SerializedFunction,
    end: {
        success: true,
        result: Success
    } | {
        success: false,
        error: string
    },
    error: string
}

class Thread<T extends Tuple<any>, S> {
    #status: "error" | "pending" | "running" | "end" = "pending";
    #result: S | undefined = undefined;
    #task: Function;
    #context: Object | undefined = undefined;
    #args: T;

    public readonly socket = new EventEmitter<EventsMap<S>>();

    constructor(task: Function, args: T, context?: Object) {
        this.#task = task;
        this.#context = context;
        this.#args = args;

        this.socket.emit("start", {
            task: this.#task.toString(),
            context: JSON.stringify(this.#context),
            args: this.#args
        });

        this.socket.on("end", (response) => {
            this.#status = "end";
            if (response.success) {
                this.#result = response.result;
            }
        });

        this.socket.on("error", () => { this.#status = "error" });
    }

    get status() {
        return this.#status;
    }

    get result() {
        return this.#result;
    }

    public bind(context: Object) {
        this.#context = context;
    }

    public join(): Promise<S> {
        return new Promise((resolve, reject) => {
            this.socket.on("end", (response) => {
                if (response.success) {
                    resolve(response.result);
                } else {
                    reject(new Error(response.error));
                }
            });

            this.socket.on("error", reject);
        });
    }

    public detach(): void {

    }
}