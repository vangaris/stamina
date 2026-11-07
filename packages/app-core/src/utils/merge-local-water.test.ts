import { NutritionStatus, type LogWater } from '@stamina/contracts';
import { WaterAmount } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { buildReadyNutrition } from '../testing/build-nutrition.ts';
import type { LocalWater } from '../types.ts';
import { mergeLocalWater } from './merge-local-water.ts';

const RECORDED_AT = '2026-11-06T10:00:00.000Z';

const local = (water: Partial<LogWater> = {}, recordedAt = RECORDED_AT): LocalWater => ({
  water: { id: crypto.randomUUID(), ml: WaterAmount.Small, date: '2026-11-06', ...water },
  recordedAt,
});

describe('mergeLocalWater', () => {
  it('adds the unsynced logs of the day to the water, leaving the target', () => {
    const state = buildReadyNutrition();

    const merged = mergeLocalWater(state, [local(), local({ ml: WaterAmount.Large })]);

    expect(merged).toMatchObject({ water: { ml: 120 + 250 + 500, targetMl: 2000 } });
    expect(state.status === NutritionStatus.Ready && state.water.ml).toBe(120);
  });

  it('ignores logs of other days, and reads a log with no day as the day it was recorded', () => {
    const state = buildReadyNutrition();
    const noDate = local({ date: undefined });

    const merged = mergeLocalWater(state, [
      local({ date: '2026-11-05' }),
      local({ date: '2026-11-07' }),
      noDate,
      local({ date: undefined }, '2026-11-05T23:00:00.000Z'),
    ]);

    expect(merged).toMatchObject({ water: { ml: 120 + 250 } });
  });

  it('returns the state itself when there is nothing to add, and for Locked and Off', () => {
    const state = buildReadyNutrition();
    const locked = { status: NutritionStatus.Locked } as const;
    const off = { status: NutritionStatus.Off } as const;

    expect(mergeLocalWater(state, [])).toBe(state);
    expect(mergeLocalWater(state, [local({ date: '2026-11-01' })])).toBe(state);
    expect(mergeLocalWater(locked, [local()])).toBe(locked);
    expect(mergeLocalWater(off, [local()])).toBe(off);
  });
});
