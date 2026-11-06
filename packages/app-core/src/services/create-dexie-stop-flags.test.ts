import type { ReportStopFlag } from '@stamina/contracts';
import { StopFlag } from '@stamina/domain';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { createDexieLocalData } from './create-dexie-local-data.ts';
import { createDexieStopFlags } from './create-dexie-stop-flags.ts';
import { createLocalDatabase } from './create-local-database.ts';

const REPORTED_AT = '2026-11-06T10:00:00.000Z';

const report = (id: string): ReportStopFlag => ({ id, flag: StopFlag.Fever, date: '2026-11-06' });

function open(indexedDB: IDBFactory) {
  const database = createLocalDatabase({ indexedDB, IDBKeyRange });
  return { flags: createDexieStopFlags(database), localData: createDexieLocalData(database) };
}

describe('createDexieStopFlags', () => {
  it('has nothing before anything is added', async () => {
    expect(await open(new IDBFactory()).flags.list()).toEqual([]);
  });

  it('lists what was added, once per id, keeping the first reportedAt', async () => {
    const { flags } = open(new IDBFactory());
    await flags.add(report('a'), REPORTED_AT);
    await flags.add(report('a'), 'later');
    await flags.add(report('b'), REPORTED_AT);

    expect(await flags.list()).toEqual([
      { report: report('a'), reportedAt: REPORTED_AT },
      { report: report('b'), reportedAt: REPORTED_AT },
    ]);
  });

  it('removes by id', async () => {
    const { flags } = open(new IDBFactory());
    await flags.add(report('a'), REPORTED_AT);
    await flags.add(report('b'), REPORTED_AT);
    await flags.remove('a');

    expect((await flags.list()).map((row) => row.report.id)).toEqual(['b']);
  });

  it('survives a reload and is wiped with the rest of the local data', async () => {
    const indexedDB = new IDBFactory();
    await open(indexedDB).flags.add(report('a'), REPORTED_AT);

    const after = open(indexedDB);
    expect(await after.flags.list()).toHaveLength(1);

    await after.localData.clear();
    expect(await after.flags.list()).toEqual([]);
  });
});
