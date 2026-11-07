import { NutritionStatus, type NutritionState } from '@stamina/contracts';
import { MealLogStatus, TEMPLATES } from '@stamina/domain';
import { Locale } from '@stamina/i18n';
import { describe, expect, it } from 'vitest';
import { MealSlotKind } from '../enums/meal-slot-kind.ts';
import { toTimelineExtras } from './to-timeline-extras.ts';

const ready = {
  status: NutritionStatus.Ready,
  water: { ml: 250, targetMl: 2200 },
  meals: [
    {
      slot: 'breakfast',
      at: 480,
      idea: { templateId: TEMPLATES[0]!.id },
      status: MealLogStatus.Ate,
    },
    { slot: 'snack', at: 630, idea: null, status: null },
    { slot: 'snack', at: 990, idea: null, status: null },
  ],
} as unknown as NutritionState;

describe('toTimelineExtras', () => {
  it('turns the ready meal slots and water into timeline extras', () => {
    expect(toTimelineExtras(ready, Locale.En)).toEqual({
      meals: [
        {
          id: 'breakfast-480',
          slot: MealSlotKind.Breakfast,
          at: 480,
          title: TEMPLATES[0]!.names.en,
          status: MealLogStatus.Ate,
        },
        { id: 'snack-630', slot: MealSlotKind.Snack, at: 630, title: undefined, status: null },
        { id: 'snack-990', slot: MealSlotKind.Snack, at: 990, title: undefined, status: null },
      ],
      water: { ml: 250, targetMl: 2200 },
    });
  });

  it('titles a meal in the Greek reader language', () => {
    expect(toTimelineExtras(ready, Locale.El).meals?.[0]?.title).toBe(TEMPLATES[0]!.names.el);
  });

  it('leaves a meal untitled when its dish is unknown to this version', () => {
    const unknown = {
      ...ready,
      meals: [{ slot: 'lunch', at: 780, idea: { templateId: 'not-a-dish' }, status: null }],
    } as unknown as NutritionState;

    expect(toTimelineExtras(unknown, Locale.En).meals?.[0]?.title).toBeUndefined();
  });

  it('adds nothing when Meals is locked, off or not read yet', () => {
    expect(toTimelineExtras({ status: NutritionStatus.Locked }, Locale.En)).toEqual({});
    expect(toTimelineExtras({ status: NutritionStatus.Off }, Locale.En)).toEqual({});
    expect(toTimelineExtras(undefined, Locale.En)).toEqual({});
  });
});
