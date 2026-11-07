import { MealLogStatus } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { pickNextMeal } from './pick-next-meal.ts';

const DAY = [
  { at: 480, status: null },
  { at: 780, status: null },
  { at: 1170, status: null },
];

describe('pickNextMeal', () => {
  it('leads with the first meal before the day starts', () => {
    expect(pickNextMeal(DAY, 360)).toBe(0);
  });

  it('keeps a meal up to 90 minutes past its time', () => {
    expect(pickNextMeal(DAY, 570)).toBe(0);
  });

  it('moves on once a meal is more than 90 minutes past', () => {
    expect(pickNextMeal(DAY, 571)).toBe(1);
  });

  it('skips logged meals', () => {
    const meals = [{ at: 480, status: MealLogStatus.Ate }, ...DAY.slice(1)];
    expect(pickNextMeal(meals, 500)).toBe(1);
  });

  it('falls back to the first unlogged meal late in the day', () => {
    const meals = [
      { at: 480, status: null },
      { at: 780, status: MealLogStatus.Skipped },
      { at: 1170, status: MealLogStatus.Ate },
    ];
    expect(pickNextMeal(meals, 1400)).toBe(0);
  });

  it('is undefined when every meal is logged', () => {
    const meals = DAY.map((meal) => ({ ...meal, status: MealLogStatus.Ate }));
    expect(pickNextMeal(meals, 600)).toBeUndefined();
  });
});
