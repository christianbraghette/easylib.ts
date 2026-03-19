import { Bool, Val } from "./arrows";
import { ArrayList, LinkedList } from "./list";
import { Pipe, } from "./pipeline";

const list = new ArrayList([[11, 15], [55, 72], [66, 28], [123, 42], [9, 1]]);
const mask = list.map(() => true);
mask[1] = false;
mask[3] = false;

list.pipe().tee(3).map([
    pipe => pipe.filter(value => value[0] > 40).map((value, index) => `Test value ${index}: ${value}`).collect().apply(console.log),
    pipe => pipe.take(2, 1).flat().tee().map([
        pipe => pipe.apply(obj => obj.register((val) => console.log("Log:", val)).leak().count().apply(console.log)).max().pipe().zip(Pipe.of("Max:").expand(val => val[0]).for(30)).peek(console.log).filter(value => value.every(value => !!value)).flat().reverse().collect().map(val => val.join(" ")),
        pipe => pipe.collect(LinkedList.from).map(list => list.toJSON())
    ]).valueOf().forEach(value => value.apply(console.log)),
    pipe => pipe.zip(mask).peek(console.log).filter(([, mask]) => mask === true).flatMap(([value]) => value as number[]).collect().apply(console.log)
]);

Pipe.of(0, 1).buffer().expand(prev => prev.at(-1)! + prev.at(-2)!).while(val => val && val < Number.POSITIVE_INFINITY).flat().tee(3).map([
    pipe => pipe.collect(),
    pipe => pipe.max(),
    pipe => pipe.count()
]).valueOf().forEach(val => val.apply(console.log));

console.log([false].reduce(Bool.or(true)));