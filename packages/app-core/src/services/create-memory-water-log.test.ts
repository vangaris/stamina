import { WaterAmount } from '@stamina/domain';
import type { LogWater } from '@stamina/contracts';
import { describe, expect, it } from 'vitest';
import { createMemoryWaterLog } from './create-memory-water-log.ts';

const RECORDED_AT = '2026-11-06T10:00:00.000Z';

const water = (id: string): LogWater => ({ id, ml: WaterAmount.Small, date: '2026-11-06' });

describe('createMemoryWaterLog', () => {
  it('lists what was added, once per id, keeping the first recordedAt', async () => {
    const log = createMemoryWaterLog();
    await log.add(water('a'), RECORDED_AT);
    await log.add(water('a'), 'later');
    await log.add(water('b'), RECORDED_AT);

    expect(await log.list()).toEqual([
      { water: water('a'), recordedAt: RECORDED_AT },
      { water: water('b'), recordedAt: RECORDED_AT },
    ]);
  });

  it('removes by id and clears everything', async () => {
    const log = createMemoryWaterLog();
    await log.add(water('a'), RECORDED_AT);
    await log.add(water('b'), RECORDED_AT);
    await log.remove('a');

    expect((await log.list()).map((row) => row.water.id)).toEqual(['b']);

    log.clear();
    expect(await log.list()).toEqual([]);
  });
});
