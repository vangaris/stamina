import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import type { Request } from '../types.ts';
import { createDexieLocalData } from './create-dexie-local-data.ts';
import { createDexieOfflineQueue } from './create-dexie-offline-queue.ts';
import { createDexieSessionLog } from './create-dexie-session-log.ts';
import { createLocalDatabase } from './create-local-database.ts';

const SESSION = '00000000-0000-4000-8000-000000000001';

function open(indexedDB: IDBFactory) {
  const database = createLocalDatabase({ indexedDB, IDBKeyRange });
  return {
    localData: createDexieLocalData(database),
    queue: createDexieOfflineQueue(database),
    log: createDexieSessionLog(database),
    database,
  };
}

async function fill({ queue, log }: ReturnType<typeof open>) {
  await queue.enqueue({ type: 'Test' } as Request);
  await log.addSet(SESSION, {
    id: 'a',
    exerciseId: 'goblet-squat',
    setNumber: 1,
    weightKg: 20,
    reps: 8,
    rpe: 7,
  });
  await log.recordFinish(SESSION, {
    finish: { id: 'f', rpe: 7 },
    recordedAt: '2026-11-06T10:00:00.000Z',
  });
}

async function rowCounts({ database }: ReturnType<typeof open>) {
  return Object.fromEntries(
    await Promise.all(database.tables.map(async (table) => [table.name, await table.count()])),
  ) as Record<string, number>;
}

describe('createDexieLocalData', () => {
  it('clear empties every table, the owner included', async () => {
    const local = open(new IDBFactory());
    await fill(local);
    await local.localData.claim('user-a');
    await fill(local);

    await local.localData.clear();

    expect(Object.values(await rowCounts(local)).every((count) => count === 0)).toBe(true);
  });

  it('claim keeps the data for the same owner and wipes it for another or for no one', async () => {
    const local = open(new IDBFactory());
    await fill(local);

    await local.localData.claim('user-a');
    expect((await local.queue.pending()).length).toBe(0);

    await fill(local);
    await local.localData.claim('user-a');
    expect((await local.queue.pending()).length).toBe(1);

    await local.localData.claim('user-b');
    expect((await local.queue.pending()).length).toBe(0);
    expect((await local.log.read(SESSION)).sets).toEqual([]);
  });

  it('remembers the owner across a reload', async () => {
    const indexedDB = new IDBFactory();
    const before = open(indexedDB);
    await before.localData.claim('user-a');
    await fill(before);

    const after = open(indexedDB);
    await after.localData.claim('user-a');
    expect((await after.queue.pending()).length).toBe(1);

    await after.localData.claim('user-b');
    expect((await after.queue.pending()).length).toBe(0);
  });
});
