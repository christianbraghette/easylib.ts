/**
 * Copyright 2025 Christian Braghette
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files 
 * (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, 
 * publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, 
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
 * DEALINGS IN THE SOFTWARE.
 */

/** */
export type IndexableData =
    | string
    | number
    | boolean
    | null
    | undefined
    | Date
    | RegExp
    | Blob
    | File
    | ArrayBuffer
    | Uint8Array | Uint16Array | Uint32Array // e altri TypedArrays
    | Map<IndexableData, IndexableData>
    | Set<IndexableData>
    | IndexableData[]
    | { [key: keyof any]: IndexableData };

/**
 * Open (or create) a simple typed IndexedDB wrapper.
 *
 * This is a lightweight helper to create and manage an IndexedDB database
 * that exposes a small typed API for tables.
 *
 * @template DB - Shape of the database where keys are table names and values are the stored value type for that table
 * @param name - Database name
 * @param tables - Array of table names to register/create in the database
 * @param version - Optional database version (defaults to `1`)
 * @returns An `IndexedDB` instance typed to `DB`
 */
export function openDB<DB extends Record<string, IndexableData>>(name: string, tables: (keyof DB)[], version?: number): Database<DB> {
    return new IndexedDB(name, tables, version);
}

/**
 * Open (or create) an ecrypted typed IndexedDB wrapper.
 *
 * This is a lightweight helper to create and manage an IndexedDB database
 * that exposes a small typed API for tables.
 *
 * @template DB - Shape of the database where keys are table names and values are the stored value type for that table
 * @param name - Database name
 * @param tables - Array of table names to register/create in the database
 * @param version - Optional database version (defaults to `1`)
 * @returns An `IndexedDB` instance typed to `DB`
 */
/*export function openEncryptedDB<DB extends Record<string, IndexableData>>(name: string, tables: (keyof DB)[], version?: number): Database<DB> {
    return new EncryptedIndexedDB(name, tables, version);
}*/

/**
 * High-level database API returned by `openDB`.
 *
 * Use the generic `DB` to describe the tables and their value types.
 */
export interface Database<DB extends Record<string, IndexableData>> {
    /** Database name */
    readonly name: string;
    /** Open a table by name and get a `Table` wrapper for it */
    openTable<K extends keyof DB>(tableName: K): Table<DB[K]>;
    /** Add a new table to the typed DB definition (returns a new `IndexedDB` instance) */
    addTable<K extends string, T>(tableName: K): Database<DB & Record<K, T>>;
    /** Remove a table from the typed DB definition (returns a new `IndexedDB` instance) */
    dropTable<K extends keyof DB>(tableName: K): Database<Omit<DB, K>>;
}

export interface Cursor<T extends IndexableData> extends AsyncIterable<[IDBValidKey, T]> { }

/**
 * Table API for operating on a single object store.
 *
 * @template T - Value type stored in the table
 */
export interface Table<T extends IndexableData> {
    /** Table (object store) name */
    readonly name: string;
    /** Put a value at `key` (overwrites existing value) */
    set(key: IDBValidKey, value: T): Promise<void>;
    /** Get a value by key, returns `undefined` if not found */
    get(key: IDBValidKey): Promise<T | undefined>;
    /** Get all values from the table */
    getAll(): Promise<T[]>;
    /** Delete a value by key */
    delete(key: IDBValidKey): Promise<void>;
    /** Get entries */
    cursor(offset?: number): Cursor<T>
    cursor(mode?: IDBTransactionMode): Cursor<T>
    cursor(mode?: IDBTransactionMode, offset?: number): Cursor<T>;
}

/**
 * Internal IndexedDB wrapper implementing the `Database` interface.
 *
 * This class manages the underlying browser `IDBDatabase` instance and the
 * set of registered object store names.
 */
class IndexedDB<DB extends Record<string, IndexableData>> implements Database<DB> {
    public readonly name: string;
    private db: IDBDatabase | null = null;
    private tables: Set<keyof DB>;
    private version: number;

    constructor(name: string, tables: (keyof DB)[], version: number = 1) {
        this.name = name;
        this.tables = new Set(tables);
        this.version = version;
    }

    private readonly getDB = (): Promise<IDBDatabase> => {
        if (this.db)
            return Promise.resolve(this.db);

        return new Promise<IDBDatabase>((resolve, reject) => {
            const request: IDBOpenDBRequest = indexedDB.open(this.name, this.version);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                for (const table of this.tables) {
                    if (!db.objectStoreNames.contains(table as string)) {
                        db.createObjectStore(table as string);
                    }
                }
            };

            request.onsuccess = () => {
                this.db = request.result;

                this.db.onversionchange = () => {
                    this.db?.close();
                    this.db = null;
                };

                resolve(this.db);
            };

            request.onerror = () => reject(request.error);
        });
    }

    public openTable<K extends keyof DB>(tableName: K): Table<DB[K]> {
        if (!this.tables.has(tableName))
            throw new Error(`Table "${tableName as string}" is not registered`);
        return new IndexedDBTable(this.getDB, tableName as string);
    }

    public addTable<K extends keyof any, T>(tableName: K): Database<DB & Record<K, T>> {
        if (this.tables.has(tableName as any))
            return this as any;
        return new IndexedDB<DB & Record<K, T>>(this.name, [...this.tables, tableName], this.version);
    }

    public dropTable<K extends keyof DB>(tableName: K): Database<Omit<DB, K>> {
        if (!this.tables.has(tableName))
            return this as any;
        this.tables.delete(tableName)
        return new IndexedDB<Omit<DB, K>>(this.name, [...this.tables] as Exclude<keyof DB, K>[], this.version);
    }

    public close(): void {
        this.db?.close();
        this.db = null;
    }
}

/*class EncryptedIndexedDB<DB extends Record<string, IndexableData>> extends IndexedDB<DB> {
    private readonly SALT_SIZE = 16;
    private readonly IV_SIZE = 12; // Standard per AES-GCM
    private readonly ITERATIONS = 100000; // Sicurezza per la password

    // Helper per convertire Buffer in Base64 (per il salvataggio testuale)
    private readonly bufToBase64 = (buf: Uint8Array) => btoa(String.fromCharCode(...buf));
    private readonly base64ToBuf = (str: string) => Uint8Array.from(atob(str), c => c.charCodeAt(0));

    #key?: CryptoKey;

    public async deriveKeyFromPassword(password: string, salt: Uint8Array): Promise<CryptoKey> {
        const encoder = new TextEncoder();
        const baseKey = await crypto.subtle.importKey(
            "raw",
            encoder.encode(password),
            "PBKDF2",
            false,
            ["deriveKey"]
        );

        return crypto.subtle.deriveKey(
            { name: "PBKDF2", salt, iterations: this.ITERATIONS, hash: "SHA-256" },
            baseKey,
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt", "decrypt"]
        );
    }

    private async generateAndSaveKey(password: string) {
        // 1. Genera la chiave principale
        const masterKey = await crypto.subtle.generateKey(
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );

        // 2. Esporta la chiave per poterla salvare
        const exportedRawKey = new Uint8Array(await crypto.subtle.exportKey("raw", masterKey));

        // 3. Proteggi la chiave con la password
        const salt = crypto.getRandomValues(new Uint8Array(this.SALT_SIZE));
        const iv = crypto.getRandomValues(new Uint8Array(this.IV_SIZE));
        const wrappingKey = await this.deriveKeyFromPassword(password, salt);

        const encryptedKey = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv },
            wrappingKey,
            exportedRawKey
        );

        // 4. Salva tutto (Salt + IV + Chiave Criptata)
        const payload = {
            salt: this.bufToBase64(salt),
            iv: this.bufToBase64(iv),
            encryptedKey: this.bufToBase64(new Uint8Array(encryptedKey))
        };

        const id = await crypto.subtle.digest("SHA-256", await crypto.subtle.exportKey("raw", await this.deriveKeyFromPassword(password, new Uint8Array(8).fill(0))));
        await openDB<{ [key: string]: string }>('__keys__', [this.name]).openTable(this.name).set(id, JSON.stringify(payload));
    }

    public async open(password: string): Promise<void> {
        const id = await crypto.subtle.digest("SHA-256", await crypto.subtle.exportKey("raw", await this.deriveKeyFromPassword(password, new Uint8Array(8).fill(0))));
        const data = await openDB<{ [key: string]: string }>('__keys__', [this.name]).openTable(this.name).get(id)
        if (!data) {
            return;
        }
        const stored = JSON.parse(data);
        const salt = this.base64ToBuf(stored.salt);
        const iv = this.base64ToBuf(stored.iv);
        const encryptedKey = this.base64ToBuf(stored.encryptedKey);

        const wrappingKey = await this.deriveKeyFromPassword(password, salt);

        const rawKey = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            wrappingKey,
            encryptedKey
        );

        this.#key = await crypto.subtle.importKey("raw", rawKey, "AES-GCM", true, ["encrypt", "decrypt"]);
    }

    async encryptData(data: string, key: CryptoKey): Promise<string> {
        const encoder = new TextEncoder();
        const iv = crypto.getRandomValues(new Uint8Array(this.IV_SIZE));
        const encrypted = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv },
            key,
            encoder.encode(data)
        );

        // Uniamo IV e Dati per facilitare il salvataggio
        const combined = new Uint8Array(iv.length + encrypted.byteLength);
        combined.set(iv);
        combined.set(new Uint8Array(encrypted), iv.length);
        return this.bufToBase64(combined);
    }

    async decryptData(encryptedBase64: string, key: CryptoKey): Promise<string> {
        const combined = this.base64ToBuf(encryptedBase64);
        const iv = combined.slice(0, this.IV_SIZE);
        const data = combined.slice(this.IV_SIZE);

        const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            key,
            data
        );

        return new TextDecoder().decode(decrypted);
    }
}*/

/**
 * Lightweight Table wrapper around an `IDBObjectStore`.
 *
 * Provides promise-based `set`, `get`, `getAll` and `delete` helpers.
 */
class IndexedDBTable<T extends IndexableData> implements Table<T> {
    public readonly name: string;
    private readonly getDB: () => Promise<IDBDatabase>;

    constructor(getDB: () => Promise<IDBDatabase>, name: string) {
        this.getDB = getDB;
        this.name = name;
    }

    public async set(key: IDBValidKey, value: T): Promise<void> {
        const db = await this.getDB();

        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.name, "readwrite");
            const store = tx.objectStore(this.name);
            const request = store.put(value, key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
            tx.onabort = () => reject(tx.error);
            tx.onerror = () => reject(tx.error);
        });
    }

    public async get(key: IDBValidKey): Promise<T | undefined> {
        const db = await this.getDB();

        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.name, "readonly");
            const store = tx.objectStore(this.name);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result ?? undefined as T | undefined);
            request.onerror = () => reject(request.error);
            tx.onabort = () => reject(tx.error);
            tx.onerror = () => reject(tx.error);
        });
    }

    public async getAll(): Promise<T[]> {
        const db = await this.getDB();

        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.name, "readonly");
            const store = tx.objectStore(this.name);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result as T[]);
            request.onerror = () => reject(request.error);
            tx.onabort = () => reject(tx.error);
            tx.onerror = () => reject(tx.error);
        });
    }

    public async delete(key: IDBValidKey): Promise<void> {
        const db = await this.getDB();

        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.name, "readwrite");
            const store = tx.objectStore(this.name);
            const request = store.delete(key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
            tx.onabort = () => reject(tx.error);
            tx.onerror = () => reject(tx.error);
        });
    }

    public cursor(offset?: number): IndexedDBCursorIterable<T>
    public cursor(mode?: IDBTransactionMode): IndexedDBCursorIterable<T>
    public cursor(mode?: IDBTransactionMode, offset?: number): IndexedDBCursorIterable<T>
    public cursor(mode?: IDBTransactionMode | number, offset?: number): IndexedDBCursorIterable<T> {
        if (typeof mode === 'number') {
            offset = mode;
            mode = undefined;
        }
        return new IndexedDBCursorIterable(this.getDB, this.name, mode, offset);
    };
}

class IndexedDBCursorIterable<T extends IndexableData> implements Cursor<T> {

    constructor(private readonly getDB: () => Promise<IDBDatabase>, private readonly tableName: string, private readonly mode: IDBTransactionMode = "readonly", private offset: number = 0) { }

    async *[Symbol.asyncIterator](): AsyncIterator<[IDBValidKey, T]> {
        const tx = (await this.getDB()).transaction(this.tableName, this.mode);
        const store = tx.objectStore(this.tableName);
        const request = store.openCursor();

        while (true) {
            const cursor = await new Promise<IDBCursorWithValue | null>((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });

            if (!cursor) break;

            if (this.offset > 0) {
                cursor.advance(this.offset);
                this.offset = 0;
                continue;
            }

            yield [cursor.key, cursor.value as T];

            cursor.continue();
        }

    }
}