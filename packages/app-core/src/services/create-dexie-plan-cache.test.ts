import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { BodyArea, Emphasis, StopFlag, type StopState } from '@stamina/domain';
import type { Checkin, WeekLoad } from '@stamina/contracts';
import { describe, expect, it } from 'vitest';
import { LocalTable } from '../enums/local-table.ts';
import { buildAdaptation } from '../testing/build-adaptation.ts';
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

  describe('stop state and latest Check-in', () => {
    const stop: StopState = {
      pausing: [StopFlag.ChestPain],
      restOn: '2026-11-06',
      excludedAreas: [BodyArea.Knee],
    };
    const checkin: Checkin = {
      id: '00000000-0000-4000-8000-000000000001',
      date: '2026-11-06',
      sleep: 3,
      soreness: 2,
      energy: 4,
      submittedAt: '2026-11-06T09:00:00.000Z',
    };

    it('returns the stop state saved, across a reload, and none before', async () => {
      const indexedDB = new IDBFactory();
      const { cache } = open(indexedDB);
      expect(await cache.readStop()).toBeUndefined();

      await cache.saveStop(stop);

      expect(await open(indexedDB).cache.readStop()).toEqual(stop);
    });

    it('drops the stop state with the cleared Screening', async () => {
      const { cache } = open(new IDBFactory());
      await cache.saveStop(stop);

      await cache.deleteClearedScreening();

      expect(await cache.readStop()).toBeUndefined();
    });

    it('treats a cached stop state in an unknown shape as not cached', async () => {
      const { database, cache } = open(new IDBFactory());
      await database.table(LocalTable.Cache).put({ key: 'stop', value: { old: 1 } });

      expect(await cache.readStop()).toBeUndefined();
    });

    it('tells a fetched "none yet" (null) from never fetched, across a reload', async () => {
      const indexedDB = new IDBFactory();
      const { cache } = open(indexedDB);
      expect(await cache.readLatestCheckin()).toBeUndefined();

      await cache.saveLatestCheckin(null);
      expect(await open(indexedDB).cache.readLatestCheckin()).toBeNull();

      await cache.saveLatestCheckin(checkin);
      expect(await open(indexedDB).cache.readLatestCheckin()).toEqual(checkin);
    });
  });

  describe('Adaptations and Session details', () => {
    const pending = buildAdaptation(testFakeSession);

    it('returns the pending list saved, across a reload, and none before', async () => {
      const indexedDB = new IDBFactory();
      const { cache } = open(indexedDB);
      expect(await cache.readAdaptations()).toBeUndefined();

      await cache.saveAdaptations([pending]);
      expect(await open(indexedDB).cache.readAdaptations()).toEqual([pending]);

      await cache.saveAdaptations([]);
      expect(await open(indexedDB).cache.readAdaptations()).toEqual([]);
    });

    it('treats cached Adaptations in an unknown shape as not cached', async () => {
      const { database, cache } = open(new IDBFactory());
      await database.table(LocalTable.Cache).put({ key: 'adaptations', value: [{ old: 1 }] });

      expect(await cache.readAdaptations()).toBeUndefined();
    });

    it('drops one Session detail', async () => {
      const { cache } = open(new IDBFactory());
      await cache.saveSessionDetail(detail);

      await cache.deleteSessionDetail(detail.id);

      expect(await cache.readSessionDetail(detail.id)).toBeUndefined();
    });
  });
});
