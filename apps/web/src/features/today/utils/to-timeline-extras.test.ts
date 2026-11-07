import { NutritionStatus, type NutritionState } from '@stamina/contracts';
import { describe, expect, it } from 'vitest';
import { MealSlotKind } from '../enums/meal-slot-kind.ts';
import { toTimelineExtras } from './to-timeline-extras.ts';

const ready = {
  status: NutritionStatus.Ready,
  water: { ml: 250, targetMl: 2200 },
  meals: [
    { slot: 'breakfast', at: 480 },
    { slot: 'snack', at: 630 },
    { slot: 'snack', at: 990 },
  ],
} as unknown as NutritionState;

describe('toTimelineExtras', () => {
  it('turns the ready meal slots and water into timeline extras', () => {
    expect(toTimelineExtras(ready)).toEqual({
      meals: [
        { id: 'breakfast-480', slot: MealSlotKind.Breakfast, at: 480, title: undefined },
        { id: 'snack-630', slot: MealSlotKind.Snack, at: 630, title: undefined },
        { id: 'snack-990', slot: MealSlotKind.Snack, at: 990, title: undefined },
      ],
      water: { ml: 250, targetMl: 2200 },
    });
  });

  it('adds nothing when Meals is locked, off or not read yet', () => {
    expect(toTimelineExtras({ status: NutritionStatus.Locked })).toEqual({});
    expect(toTimelineExtras({ status: NutritionStatus.Off })).toEqual({});
    expect(toTimelineExtras(undefined)).toEqual({});
  });
});
