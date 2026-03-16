import EventEmitter, { EventCallback } from "./index";

type EventsMap = {
    message: string,
    data: number,
    close: void
}

const e = new EventEmitter<EventsMap>();

let fun: EventCallback<'message', typeof e> = (data) => {
    console.log("Message:", data);
}

e.on('data', (data, emitter) => {
    console.log("Open", data);

    emitter.on('message', fun);

    emitter.emit('message', "Dio");
});

e.emit('data', 2);

setTimeout(async () => {
    const test = await e.wait('data');
    e.emit('message', String(test));
}, 0);

setTimeout(async () => {
    fun = (data) => {
        console.log("Message2:", data);
    }
}, 500)

setTimeout(() => {
    e.emit('data', 1)
    e.emit('close', undefined)
}, 1000);
