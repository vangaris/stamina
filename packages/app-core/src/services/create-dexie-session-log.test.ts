import type { LogSet } from '@stamina/contracts';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { createDexieSessionLog } from './create-dexie-session-log.ts';
import { createLocalDatabase } from './create-local-database.ts';

const SESSION = '00000000-0000-4000-8000-000000000001';
const OTHER_SESSION = '00000000-0000-4000-8000-000000000002';
const FINISHED_AT = '2026-11-06T10:00:00.000Z';

const set = (id: string, setNumber = 1): LogSet => ({
  id,
  exerciseId: 'goblet-squat',
  setNumber,
  weightKg: 20,
  reps: 8,
  rpe: 7,
});

function open(indexedDB: IDBFactory) {
  return createDexieSessionLog(createLocalDatabase({ indexedDB, IDBKeyRange }));
}

describe('createDexieSessionLog', () => {
  it('reads back the sets of one Session only, and nothing for an untouched one', async () => {
    const log = open(new IDBFactory());
    await log.addSet(SESSION, set('a'));
    await log.addSet(OTHER_SESSION, set('b'));

    expect((await log.read(SESSION)).sets).toEqual([set('a')]);
    expect(await log.read('00000000-0000-4000-8000-000000000003')).toEqual({
      sets: [],
      finish: null,
    });
  });

  it('adds a set once however often it is added, and removes it by id', async () => {
    const log = open(new IDBFactory());
    await log.addSet(SESSION, set('a'));
    await log.addSet(SESSION, set('a'));
    await log.addSet(SESSION, set('b', 2));
    await log.removeSet('b');

    expect((await log.read(SESSION)).sets).toEqual([set('a')]);
  });

  it('keeps the first finish of a Session', async () => {
    const log = open(new IDBFactory());
    await log.recordFinish(SESSION, { finish: { id: 'f1', rpe: 7 }, recordedAt: FINISHED_AT });
    await log.recordFinish(SESSION, { finish: { id: 'f2', rpe: 9, minutes: 30 }, recordedAt: 'x' });

    expect((await log.read(SESSION)).finish).toEqual({
      finish: { id: 'f1', rpe: 7 },
      recordedAt: FINISHED_AT,
    });
  });

  it('removes a finish only when it is the one with that id', async () => {
    const log = open(new IDBFactory());
    await log.recordFinish(SESSION, { finish: { id: 'f1', rpe: 7 }, recordedAt: FINISHED_AT });

    await log.removeFinish(SESSION, 'f2');
    expect((await log.read(SESSION)).finish?.finish.id).toBe('f1');

    await log.removeFinish(SESSION, 'f1');
    expect((await log.read(SESSION)).finish).toBeNull();
  });

  it('survives a reload', async () => {
    const indexedDB = new IDBFactory();
    const before = open(indexedDB);
    await before.addSet(SESSION, set('a'));
    await before.recordFinish(SESSION, { finish: { id: 'f1', rpe: 7 }, recordedAt: FINISHED_AT });

    const read = await open(indexedDB).read(SESSION);

    expect(read.sets).toEqual([set('a')]);
    expect(read.finish?.finish.id).toBe('f1');
  });
});
