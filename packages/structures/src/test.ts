import { LinkedList } from "./list";

const list = new LinkedList([11, 55, 66, 123, 9]);

list.filter(value => value > 40).map((value, index) => `Test value ${index}: ${value}`).forEach(value => console.log(value));