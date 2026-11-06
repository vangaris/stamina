import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import type { Request } from '../types.ts';
import { createDexieOfflineQueue } from './create-dexie-offline-queue.ts';
import { createLocalDatabase } from './create-local-database.ts';

const request = (n: number): Request => ({ type: 'Test', n }) as Request;

function open(indexedDB: IDBFactory) {
  return createDexieOfflineQueue(createLocalDatabase({ indexedDB, IDBKeyRange }));
}

describe('createDexieOfflineQueue', () => {
  it('lists entries in insertion order with ascending ids', async () => {
    const queue = open(new IDBFactory());
    for (const n of [3, 1, 2]) await queue.enqueue(request(n));

    const pending = await queue.pending();

    expect(pending.map((entry) => entry.request)).toEqual([request(3), request(1), request(2)]);
    expect(pending.map((entry) => entry.id)).toEqual([...pending.map((entry) => entry.id)].sort());
  });

  it('removes one entry by id and ignores an unknown id', async () => {
    const queue = open(new IDBFactory());
    await queue.enqueue(request(1));
    await queue.enqueue(request(2));
    const [first] = await queue.pending();

    await queue.remove(first?.id ?? -1);
    await queue.remove(9999);

    expect((await queue.pending()).map((entry) => entry.request)).toEqual([request(2)]);
  });

  it('survives a reload: a new database on the same IndexedDB sees the entries, in order', async () => {
    const indexedDB = new IDBFactory();
    const before = open(indexedDB);
    await before.enqueue(request(1));
    await before.enqueue(request(2));

    const after = open(indexedDB);
    await after.enqueue(request(3));

    expect((await after.pending()).map((entry) => entry.request)).toEqual([
      request(1),
      request(2),
      request(3),
    ]);
  });

  it('does not reuse the id of a removed entry', async () => {
    const queue = open(new IDBFactory());
    await queue.enqueue(request(1));
    const [first] = await queue.pending();
    await queue.remove(first?.id ?? -1);
    await queue.enqueue(request(2));

    const [second] = await queue.pending();

    expect(second?.id).toBeGreaterThan(first?.id ?? Infinity);
  });
});
