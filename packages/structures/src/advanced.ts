/**
 * A BitSet implements a vector of bits that grows as needed.
 * Each component of the bit set has a boolean value. 
 * Extremely memory efficient for large sets of integers.
 */
export class BitSet {
    #words: Uint32Array;
    #size: number = 0;

    /**
     * @param initialCapacity The initial number of bits (rounded up to the nearest 32-bit word).
     */
    constructor(initialCapacity: number = 32) {
        this.#words = new Uint32Array(Math.ceil(initialCapacity / 32));
    }

    /**
     * Sets the bit at the specified index to true.
     * @param index The index of the bit to set.
     */
    public add(index: number): void {
        if (index < 0) throw new Error("Index must be non-negative");
        this.#ensureCapacity(index);
        
        const wordIndex = index >>> 5; // Equivalente a Math.floor(index / 32)
        const bitIndex = index & 31;  // Equivalente a index % 32
        
        const oldWord = this.#words[wordIndex];
        this.#words[wordIndex] |= (1 << bitIndex);
        
        if (this.#words[wordIndex] !== oldWord) {
            this.#size++;
        }
    }

    /**
     * Sets the bit at the specified index to false.
     * @param index The index of the bit to clear.
     */
    public delete(index: number): boolean {
        if (index < 0 || index >= this.#words.length * 32) return false;
        
        const wordIndex = index >>> 5;
        const bitIndex = index & 31;
        
        const oldWord = this.#words[wordIndex];
        this.#words[wordIndex] &= ~(1 << bitIndex);
        
        if (this.#words[wordIndex] !== oldWord) {
            this.#size--;
            return true;
        }
        return false;
    }

    /**
     * Checks if the bit at the specified index is set to true.
     * @param index The index of the bit to check.
     */
    public has(index: number): boolean {
        const wordIndex = index >>> 5;
        if (wordIndex >= this.#words.length) return false;
        
        const bitIndex = index & 31;
        return (this.#words[wordIndex] & (1 << bitIndex)) !== 0;
    }

    /**
     * Returns the number of bits set to true.
     */
    public get size(): number {
        return this.#size;
    }

    /**
     * Performs a logical AND with another BitSet.
     */
    public and(other: BitSet): void {
        const minLen = Math.min(this.#words.length, other.#words.length);
        for (let i = 0; i < minLen; i++) {
            this.#words[i] &= other.#words[i];
        }
        // I bit rimanenti diventano 0 perché non sono presenti in 'other'
        for (let i = minLen; i < this.#words.length; i++) {
            this.#words[i] = 0;
        }
        this.#recalculateSize();
    }

    /**
     * Performs a logical OR with another BitSet.
     */
    public or(other: BitSet): void {
        this.#ensureCapacity(other.#words.length * 32 - 1);
        for (let i = 0; i < other.#words.length; i++) {
            this.#words[i] |= other.#words[i];
        }
        this.#recalculateSize();
    }

    #ensureCapacity(bitIndex: number): void {
        const wordIndex = bitIndex >>> 5;
        if (wordIndex >= this.#words.length) {
            const newWords = new Uint32Array(wordIndex + 1);
            newWords.set(this.#words);
            this.#words = newWords;
        }
    }

    #recalculateSize(): void {
        let count = 0;
        for (let i = 0; i < this.#words.length; i++) {
            let v = this.#words[i];
            // Brian Kernighan's algorithm per contare i bit impostati a 1
            while (v) {
                v &= v - 1;
                count++;
            }
        }
        this.#size = count;
    }

    public *values(): IterableIterator<number> {
        for (let i = 0; i < this.#words.length; i++) {
            let word = this.#words[i];
            if (word === 0) continue;
            for (let j = 0; j < 32; j++) {
                if ((word & (1 << j)) !== 0) {
                    yield (i << 5) + j;
                }
            }
        }
    }
}