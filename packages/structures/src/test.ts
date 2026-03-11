import { IndexableIterable } from "./index";
import { LinkedList } from "./list";

const list = new LinkedList([[11, 15], [55, 72], [66, 28], [123, 42], [9, 1]]);

list.filter(value => value[0] > 40).map((value, index) => `Test value ${index}: ${value}`).forEach(value => console.log(value));

for (const value of new IndexableIterable(list)[1])
    console.log(value);