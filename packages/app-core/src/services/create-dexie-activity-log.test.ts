import { SportKind, type LogActivity } from '@stamina/contracts';
import { Intensity, LaunchSport } from '@stamina/domain';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { createDexieActivityLog } from './create-dexie-activity-log.ts';
import { createDexieLocalData } from './create-dexie-local-data.ts';
import { createLocalDatabase } from './create-local-database.ts';

const RECORDED_AT = '2026-11-06T10:00:00.000Z';

const activity = (id: string): LogActivity => ({
  id,
  sport: { kind: SportKind.Launch, sport: LaunchSport.Padel },
  date: '2026-11-06',
  minutes: 60,
  intensity: Intensity.Moderate,
  hot: false,
});

function open(indexedDB: IDBFactory) {
  const database = createLocalDatabase({ indexedDB, IDBKeyRange });
  return { log: createDexieActivityLog(database), localData: createDexieLocalData(database) };
}

describe('createDexieActivityLog', () => {
  it('has nothing before anything is added', async () => {
    expect(await open(new IDBFactory()).log.list()).toEqual([]);
  });

  it('lists what was added, once per id, keeping the first recordedAt', async () => {
    const { log } = open(new IDBFactory());
    await log.add(activity('a'), RECORDED_AT);
    await log.add(activity('a'), 'later');
    await log.add(activity('b'), RECORDED_AT);

    expect(await log.list()).toEqual([
      { activity: activity('a'), recordedAt: RECORDED_AT },
      { activity: activity('b'), recordedAt: RECORDED_AT },
    ]);
  });

  it('removes by id', async () => {
    const { log } = open(new IDBFactory());
    await log.add(activity('a'), RECORDED_AT);
    await log.add(activity('b'), RECORDED_AT);
    await log.remove('a');

    expect((await log.list()).map((row) => row.activity.id)).toEqual(['b']);
  });

  it('survives a reload and is wiped with the rest of the local data', async () => {
    const indexedDB = new IDBFactory();
    await open(indexedDB).log.add(activity('a'), RECORDED_AT);

    const after = open(indexedDB);
    expect(await after.log.list()).toHaveLength(1);

    await after.localData.clear();
    expect(await after.log.list()).toEqual([]);
  });
});
