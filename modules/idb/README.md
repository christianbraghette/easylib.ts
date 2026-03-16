# easyidb.ts

A tiny TypeScript wrapper around the browser IndexedDB API. Provides a small,
typed interface for opening a database and working with simple object stores
using promise-based helpers.

## Features

- Minimal, zero-dependency wrapper for IndexedDB
- Typed API using TypeScript generics
- Promise-based `set`, `get`, `getAll`, `delete` helpers

## Install

```bash
npm install easyidb.ts
```

## Quick Usage

Example TypeScript usage:

```ts
import { openDB } from 'easyidb.ts';

type MyDB = {
  users: { id: number; name: string };
};

const db = openDB<MyDB>('my-db', ['users']);
const users = db.openTable('users');

await users.set(1, { id: 1, name: 'Alice' });
const alice = await users.get(1);
const all = await users.getAll();
```

## API

- `openDB<DB>(name, tables, version?)` — create/open a typed database
- `db.openTable(name)` — return a `Table<T>` wrapper for a named table
- `Table<T>.set(key, value)` — store a value
- `Table<T>.get(key)` — read a value or `undefined`
- `Table<T>.getAll()` — read all values
- `Table<T>.delete(key)` — delete a value

## License

GPL 3.0 — see the `LICENSE` file for details.
