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

import { Tuple } from "./index";
import { Iterables } from "./iterables";
import { HashMap, } from "./map";
import { Series } from "./series";

class Index<T> extends Series<T> {
    [key: number]: T;

    constructor(iterable: Iterable<T>) {
        function* iterator(): IterableIterator<[number, T]> {
            let i = 0;
            for (const value of iterable)
                yield [i++, value];
        }

        super(iterator());
        return new Proxy(this, {
            get: (target, prop) => {
                if (typeof prop === 'string' && /^\d+$/.test(prop)) {
                    return target.loc[Number(prop)];
                }
                return Reflect.get(target, prop);
            },
            set: (target, prop, value) => {
                if (typeof prop === 'string' && /^\d+$/.test(prop)) {
                    target.loc[Number(prop), value];
                    return true;
                }
                return Reflect.set(target, prop, value);
            }
        })
    }
}

export class DataFrame<T extends Record<string, any>> {
    //[key: string]: Index<T[keyof T]>;

    #map = new HashMap<keyof T, Index<T[keyof T]>>();

    constructor(iterable: Iterable<Tuple<(T[keyof T])[]>>, columns: (keyof T)[]) {
        const indexable = Iterables.index(iterable);

        for (let i = 0; i < columns.length; i++)
            this.#map.set(columns[i], new Index(indexable[i] as any))
    }
}