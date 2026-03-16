import { ArrayList, LinkedList } from "./list";
import { SyncPipelineConstructor } from "./pipeline";

const list = new ArrayList([[11, 15], [55, 72], [66, 28], [123, 42], [9, 1]]);

list.filter(value => value[0] > 40).map((value, index) => `Test value ${index}: ${value}`).forEach(value => console.log(value));

const [pipe1, pipe2] = new SyncPipelineConstructor(list).take(2, 1).flat().tee();
pipe2.tap().register((val) => console.log(val));
console.log(pipe2.leak().count());
console.log(pipe2.max());
console.log(pipe1.collect(LinkedList.from).toJSON());