import { NutritionStatus, type LogMeal, type NutritionState } from '@stamina/contracts';
import { MealLogStatus } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { buildReadyNutrition } from '../testing/build-nutrition.ts';
import type { LocalMeal } from '../types.ts';
import { mergeLocalMeals } from './merge-local-meals.ts';

const RECORDED_AT = '2026-11-06T10:00:00.000Z';

const local = (meal: Partial<LogMeal> = {}, recordedAt = RECORDED_AT): LocalMeal => ({
  meal: {
    id: crypto.randomUUID(),
    slotIndex: 0,
    status: MealLogStatus.Ate,
    date: '2026-11-06',
    ...meal,
  },
  recordedAt,
});

const statuses = (state: NutritionState) =>
  state.status === NutritionStatus.Ready ? state.meals.map(({ status }) => status) : [];

describe('mergeLocalMeals', () => {
  it('sets the status of the slots the device logged and leaves the others', () => {
    const state = buildReadyNutrition();

    const merged = mergeLocalMeals(state, [
      local({ slotIndex: 1, status: MealLogStatus.Skipped }),
      local({ slotIndex: 2, status: MealLogStatus.Other }),
    ]);

    expect(statuses(merged)).toEqual([null, MealLogStatus.Skipped, MealLogStatus.Other]);
    expect(statuses(state)).toEqual([null, null, null]);
  });

  it('overrides the status the server already shows for the slot', () => {
    const state = buildReadyNutrition();
    state.meals[0]!.status = MealLogStatus.Ate;

    const merged = mergeLocalMeals(state, [local({ status: MealLogStatus.Skipped })]);

    expect(statuses(merged)).toEqual([MealLogStatus.Skipped, null, null]);
  });

  it('lets the latest log of a slot win, whatever order they are listed in', () => {
    const state = buildReadyNutrition();
    const early = local({ status: MealLogStatus.Ate }, '2026-11-06T09:00:00.000Z');
    const late = local({ status: MealLogStatus.Skipped }, '2026-11-06T11:00:00.000Z');

    expect(statuses(mergeLocalMeals(state, [early, late]))).toEqual([
      MealLogStatus.Skipped,
      null,
      null,
    ]);
    expect(statuses(mergeLocalMeals(state, [late, early]))).toEqual([
      MealLogStatus.Skipped,
      null,
      null,
    ]);
  });

  it('keeps the idea of the slot', () => {
    const idea = {
      templateId: 'vegan-breakfast-1',
      portions: [{ ingredientId: 'banana', grams: 100 }],
      kcal: 100,
      proteinG: 1,
      carbsG: 20,
      fatG: 0,
    };
    const state = buildReadyNutrition();
    state.meals[0]!.idea = idea;

    const merged = mergeLocalMeals(state, [local()]);

    expect(merged.status === NutritionStatus.Ready && merged.meals[0]!.idea).toEqual(idea);
  });

  it('ignores logs of other days (a log with no day is the day it was recorded), and slots the day lacks', () => {
    const state = buildReadyNutrition();
    const noDate = local({ slotIndex: 2, status: MealLogStatus.Other });
    delete noDate.meal.date;

    const merged = mergeLocalMeals(state, [
      local({ date: '2026-11-05' }),
      local({ date: '2026-11-07' }),
      local({ slotIndex: 4 }),
      noDate,
    ]);

    expect(statuses(merged)).toEqual([null, null, MealLogStatus.Other]);
  });

  it('returns the state itself when there is nothing to apply, and Locked and Off as they are', () => {
    const state = buildReadyNutrition();
    const locked = { status: NutritionStatus.Locked } as const;
    const off = { status: NutritionStatus.Off } as const;

    expect(mergeLocalMeals(state, [])).toBe(state);
    expect(mergeLocalMeals(state, [local({ date: '2026-11-01' })])).toBe(state);
    expect(mergeLocalMeals(locked, [local()])).toBe(locked);
    expect(mergeLocalMeals(off, [local()])).toBe(off);
  });
});
