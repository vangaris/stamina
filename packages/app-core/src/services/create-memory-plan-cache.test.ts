import type { Checkin } from '@stamina/contracts';
import { BodyArea, Emphasis, StopFlag, type StopState } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { buildAdaptation } from '../testing/build-adaptation.ts';
import { testFakeSession } from '../testing/test-fake-session.ts';
import { buildFakeSessionDetail } from '../utils/build-fake-session-detail.ts';
import { createMemoryPlanCache } from './create-memory-plan-cache.ts';

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

describe('createMemoryPlanCache stop state and Check-in', () => {
  it('has nothing before anything is saved', async () => {
    const cache = createMemoryPlanCache();

    expect(await cache.readStop()).toBeUndefined();
    expect(await cache.readLatestCheckin()).toBeUndefined();
  });

  it('returns the stop state saved, as a copy', async () => {
    const cache = createMemoryPlanCache();
    await cache.saveStop(stop);

    const read = await cache.readStop();
    expect(read).toEqual(stop);
    expect(read).not.toBe(stop);
  });

  it('drops the stop state with the cleared Screening', async () => {
    const cache = createMemoryPlanCache();
    await cache.saveStop(stop);

    await cache.deleteClearedScreening();

    expect(await cache.readStop()).toBeUndefined();
  });

  it('tells a fetched "none yet" (null) from never fetched', async () => {
    const cache = createMemoryPlanCache();
    await cache.saveLatestCheckin(null);
    expect(await cache.readLatestCheckin()).toBeNull();

    await cache.saveLatestCheckin(checkin);
    expect(await cache.readLatestCheckin()).toEqual(checkin);

    cache.clear();
    expect(await cache.readLatestCheckin()).toBeUndefined();
    expect(await cache.readStop()).toBeUndefined();
  });
});

describe('createMemoryPlanCache Adaptations and Session details', () => {
  const pending = buildAdaptation(testFakeSession);

  it('tells a fetched empty list from never fetched, and returns a copy', async () => {
    const cache = createMemoryPlanCache();
    expect(await cache.readAdaptations()).toBeUndefined();

    await cache.saveAdaptations([]);
    expect(await cache.readAdaptations()).toEqual([]);

    await cache.saveAdaptations([pending]);
    const read = await cache.readAdaptations();
    expect(read).toEqual([pending]);
    expect(read?.[0]).not.toBe(pending);

    cache.clear();
    expect(await cache.readAdaptations()).toBeUndefined();
  });

  it('drops one Session detail and keeps the others', async () => {
    const cache = createMemoryPlanCache();
    const detail = buildFakeSessionDetail(testFakeSession, Emphasis.Strength, [], null);
    const other = { ...detail, id: '00000000-0000-4000-8000-0000000000aa' };
    await cache.saveSessionDetail(detail);
    await cache.saveSessionDetail(other);

    await cache.deleteSessionDetail(detail.id);

    expect(await cache.readSessionDetail(detail.id)).toBeUndefined();
    expect(await cache.readSessionDetail(other.id)).toEqual(other);
  });
});
