/**
 * Easylib.ts
 * 
 * Copyright 2026 Christian Braghette
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ArrayList, LinkedList } from "./list";
import { SyncPipelineConstructor } from "./pipeline";

const list = new ArrayList([[11, 15], [55, 72], [66, 28], [123, 42], [9, 1]]);

list.filter(value => value[0] > 40).map((value, index) => `Test value ${index}: ${value}`).forEach(value => console.log(value));

const [pipe1, pipe2] = new SyncPipelineConstructor(list).take(2, 1).flat().tee();
pipe2.tap().register((val) => console.log(val));
console.log(pipe2.leak().count());
console.log(pipe2.max());
console.log(pipe1.collect(LinkedList.from).toJSON());