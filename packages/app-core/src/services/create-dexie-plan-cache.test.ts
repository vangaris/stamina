import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { Emphasis } from '@stamina/domain';
import type { WeekLoad } from '@stamina/contracts';
import { describe, expect, it } from 'vitest';
import { LocalTable } from '../enums/local-table.ts';
import { testFakeSession } from '../testing/test-fake-session.ts';
import { buildFakeSessionDetail } from '../utils/build-fake-session-detail.ts';
import { createDexiePlanCache } from './create-dexie-plan-cache.ts';
import { createLocalDatabase } from './create-local-database.ts';
import { FAKE_PROGRAM } from '../config.ts';

const detail = buildFakeSessionDetail(testFakeSession, Emphasis.Strength, [], null);
const week = {
  block: {
    emphasis: Emphasis.Strength,
    startsOn: '2026-11-07',
    weekInBlock: FAKE_PROGRAM.weekInBlock,
    limited: false,
    beta: false,
  },
  sessions: [testFakeSession],
  hardActivityDates: [],
};

const weekLoad: WeekLoad = {
  startsOn: '2026-11-02',
  sessionLoad: 100,
  activityLoad: 0,
  load: 100,
  average: null,
  previous: [],
  plannedActivities: [],
  activities: [],
};

function open(indexedDB: IDBFactory) {
  const database = createLocalDatabase({ indexedDB, IDBKeyRange });
  return { database, cache: createDexiePlanCache(database) };
}

describe('createDexiePlanCache', () => {
  it('has nothing before anything is saved', async () => {
    const { cache } = open(new IDBFactory());

    expect(await cache.readProgram()).toBeUndefined();
    expect(await cache.readSessionDetail(detail.id)).toBeUndefined();
  });

  it('returns the last program and the Session detail saved, across a reload', async () => {
    const indexedDB = new IDBFactory();
    const { cache } = open(indexedDB);
    await cache.saveProgram(week);
    await cache.saveSessionDetail(detail);

    const reloaded = open(indexedDB).cache;

    expect(await reloaded.readProgram()).toEqual(week);
    expect(await reloaded.readSessionDetail(detail.id)).toEqual(detail);
  });

  it('returns the week Load saved, across a reload, and none before', async () => {
    const indexedDB = new IDBFactory();
    const { cache } = open(indexedDB);
    expect(await cache.readWeekLoad()).toBeUndefined();

    await cache.saveWeekLoad(weekLoad);

    expect(await open(indexedDB).cache.readWeekLoad()).toEqual(weekLoad);
  });

  it('treats a cached week Load in an unknown shape as not cached', async () => {
    const { database, cache } = open(new IDBFactory());
    await database.table(LocalTable.Cache).put({ key: 'week-load', value: { old: 1 } });

    expect(await cache.readWeekLoad()).toBeUndefined();
  });

  it('treats a cached value in an unknown shape as not cached', async () => {
    const { database, cache } = open(new IDBFactory());
    await database.table(LocalTable.Cache).put({ key: `session:${detail.id}`, value: { old: 1 } });
    await database.table(LocalTable.Cache).put({ key: 'program', value: 'stale' });

    expect(await cache.readSessionDetail(detail.id)).toBeUndefined();
    expect(await cache.readProgram()).toBeUndefined();
  });
});
