import type { Checkin } from '@stamina/contracts';
import { BodyArea, StopFlag, type StopState } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
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
