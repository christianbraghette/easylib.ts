import { AtomicInt32 } from ".";

const num = new AtomicInt32();

setTimeout(() => {
    num.set(1);
    num.notify();
}, 1000)

num.waitAsync(0).then((res) => console.log("Result:", res, num.get()));