import type { LogMeal } from '@stamina/contracts';
import { MealLogStatus } from '@stamina/domain';
import Dexie from 'dexie';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { createDexieLocalData } from './create-dexie-local-data.ts';
import { createDexieMealLogs } from './create-dexie-meal-logs.ts';
import { createLocalDatabase } from './create-local-database.ts';

const RECORDED_AT = '2026-11-06T10:00:00.000Z';

const meal = (id: string): LogMeal => ({
  id,
  slotIndex: 2,
  status: MealLogStatus.Skipped,
  date: '2026-11-06',
});

function open(indexedDB: IDBFactory) {
  const database = createLocalDatabase({ indexedDB, IDBKeyRange });
  return { log: createDexieMealLogs(database), localData: createDexieLocalData(database) };
}

describe('createDexieMealLogs', () => {
  it('has nothing before anything is added', async () => {
    expect(await open(new IDBFactory()).log.list()).toEqual([]);
  });

  it('lists what was added, once per id, keeping the first recordedAt', async () => {
    const { log } = open(new IDBFactory());
    await log.add(meal('a'), RECORDED_AT);
    await log.add(meal('a'), 'later');
    await log.add(meal('b'), RECORDED_AT);

    expect(await log.list()).toEqual([
      { meal: meal('a'), recordedAt: RECORDED_AT },
      { meal: meal('b'), recordedAt: RECORDED_AT },
    ]);
  });

  it('removes by id', async () => {
    const { log } = open(new IDBFactory());
    await log.add(meal('a'), RECORDED_AT);
    await log.add(meal('b'), RECORDED_AT);
    await log.remove('a');

    expect((await log.list()).map((row) => row.meal.id)).toEqual(['b']);
  });

  it('survives a reload and is wiped with the rest of the local data', async () => {
    const indexedDB = new IDBFactory();
    await open(indexedDB).log.add(meal('a'), RECORDED_AT);

    const after = open(indexedDB);
    expect(await after.log.list()).toHaveLength(1);

    await after.localData.clear();
    expect(await after.log.list()).toEqual([]);
  });

  it('opens a database written before meal logs existed, with the new store empty', async () => {
    const indexedDB = new IDBFactory();
    const older = new Dexie('stamina', { indexedDB, IDBKeyRange });
    older.version(5).stores({
      queue: '++id',
      sets: 'id, sessionId',
      finishes: 'sessionId',
      activities: 'id',
      waterLogs: 'id',
      stopFlags: 'id',
      checkins: 'id',
      cache: 'key',
      owner: 'key',
    });
    await older.table('waterLogs').add({ id: 'w', water: { id: 'w' }, recordedAt: RECORDED_AT });
    older.close();

    const { log } = open(indexedDB);

    expect(await log.list()).toEqual([]);
    await log.add(meal('a'), RECORDED_AT);
    expect(await log.list()).toHaveLength(1);
  });
});
