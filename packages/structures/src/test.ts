function* test(array: number[]) {
    for (let i = array.length - 1; i >= 0; i--)
        yield array[i];
}

for (let n of test([3, 4, 5, 6]))
    console.log(n);