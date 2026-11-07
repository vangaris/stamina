import type { LogMeal } from '@stamina/contracts';
import { MealLogStatus } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { createMemoryMealLogs } from './create-memory-meal-logs.ts';

const RECORDED_AT = '2026-11-06T10:00:00.000Z';

const meal = (id: string): LogMeal => ({
  id,
  slotIndex: 1,
  status: MealLogStatus.Ate,
  date: '2026-11-06',
});

describe('createMemoryMealLogs', () => {
  it('lists what was added, once per id, keeping the first recordedAt', async () => {
    const log = createMemoryMealLogs();
    await log.add(meal('a'), RECORDED_AT);
    await log.add(meal('a'), 'later');
    await log.add(meal('b'), RECORDED_AT);

    expect(await log.list()).toEqual([
      { meal: meal('a'), recordedAt: RECORDED_AT },
      { meal: meal('b'), recordedAt: RECORDED_AT },
    ]);
  });

  it('removes by id and clears everything', async () => {
    const log = createMemoryMealLogs();
    await log.add(meal('a'), RECORDED_AT);
    await log.add(meal('b'), RECORDED_AT);
    await log.remove('a');

    expect((await log.list()).map((row) => row.meal.id)).toEqual(['b']);

    log.clear();
    expect(await log.list()).toEqual([]);
  });
});
