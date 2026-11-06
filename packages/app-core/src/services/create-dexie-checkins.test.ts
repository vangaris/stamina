import type { SubmitCheckin } from '@stamina/contracts';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { createDexieCheckins } from './create-dexie-checkins.ts';
import { createDexieLocalData } from './create-dexie-local-data.ts';
import { createLocalDatabase } from './create-local-database.ts';

const RECORDED_AT = '2026-11-06T10:00:00.000Z';

const checkin = (id: string, date = '2026-11-06'): SubmitCheckin => ({
  id,
  date,
  sleep: 3,
  soreness: 2,
  energy: 4,
});

function open(indexedDB: IDBFactory) {
  const database = createLocalDatabase({ indexedDB, IDBKeyRange });
  return { checkins: createDexieCheckins(database), localData: createDexieLocalData(database) };
}

describe('createDexieCheckins', () => {
  it('has no latest before anything is added', async () => {
    expect(await open(new IDBFactory()).checkins.latest()).toBeNull();
  });

  it('keeps the first recordedAt for an id and reads the latest day', async () => {
    const { checkins } = open(new IDBFactory());
    await checkins.add(checkin('a'), RECORDED_AT);
    await checkins.add(checkin('a'), 'later');
    await checkins.add(checkin('b', '2026-11-05'), '2026-11-06T11:00:00.000Z');

    expect(await checkins.latest()).toEqual({ checkin: checkin('a'), recordedAt: RECORDED_AT });
  });

  it('removes by id', async () => {
    const { checkins } = open(new IDBFactory());
    await checkins.add(checkin('a'), RECORDED_AT);
    await checkins.add(checkin('b', '2026-11-05'), RECORDED_AT);
    await checkins.remove('a');

    expect((await checkins.latest())?.checkin.id).toBe('b');
  });

  it('survives a reload and is wiped with the rest of the local data', async () => {
    const indexedDB = new IDBFactory();
    await open(indexedDB).checkins.add(checkin('a'), RECORDED_AT);

    const after = open(indexedDB);
    expect((await after.checkins.latest())?.checkin.id).toBe('a');

    await after.localData.clear();
    expect(await after.checkins.latest()).toBeNull();
  });
});
