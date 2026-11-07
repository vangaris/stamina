import type { LogWater } from '@stamina/contracts';
import { WaterAmount } from '@stamina/domain';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { createDexieLocalData } from './create-dexie-local-data.ts';
import { createDexieWaterLog } from './create-dexie-water-log.ts';
import { createLocalDatabase } from './create-local-database.ts';

const RECORDED_AT = '2026-11-06T10:00:00.000Z';

const water = (id: string): LogWater => ({ id, ml: WaterAmount.Large, date: '2026-11-06' });

function open(indexedDB: IDBFactory) {
  const database = createLocalDatabase({ indexedDB, IDBKeyRange });
  return { log: createDexieWaterLog(database), localData: createDexieLocalData(database) };
}

describe('createDexieWaterLog', () => {
  it('has nothing before anything is added', async () => {
    expect(await open(new IDBFactory()).log.list()).toEqual([]);
  });

  it('lists what was added, once per id, keeping the first recordedAt', async () => {
    const { log } = open(new IDBFactory());
    await log.add(water('a'), RECORDED_AT);
    await log.add(water('a'), 'later');
    await log.add(water('b'), RECORDED_AT);

    expect(await log.list()).toEqual([
      { water: water('a'), recordedAt: RECORDED_AT },
      { water: water('b'), recordedAt: RECORDED_AT },
    ]);
  });

  it('removes by id', async () => {
    const { log } = open(new IDBFactory());
    await log.add(water('a'), RECORDED_AT);
    await log.add(water('b'), RECORDED_AT);
    await log.remove('a');

    expect((await log.list()).map((row) => row.water.id)).toEqual(['b']);
  });

  it('survives a reload and is wiped with the rest of the local data', async () => {
    const indexedDB = new IDBFactory();
    await open(indexedDB).log.add(water('a'), RECORDED_AT);

    const after = open(indexedDB);
    expect(await after.log.list()).toHaveLength(1);

    await after.localData.clear();
    expect(await after.log.list()).toEqual([]);
  });
});
