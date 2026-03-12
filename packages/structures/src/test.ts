import { ArrayList, LinkedList } from "./list";
import { Pipeline } from "./pipeline";

const list = new ArrayList([[11, 15], [55, 72], [66, 28], [123, 42], [9, 1]]);

list.flat()

list.filter(value => value[0] > 40).map((value, index) => `Test value ${index}: ${value}`).forEach(value => console.log(value));

list[-2] = [43, 28]
console.log(list[-2]);

const test = new Pipeline(list).take(2, 1).flat().collect(LinkedList.from);
console.log(test);
