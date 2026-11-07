import { MealLogStatus, MealSlot, TEMPLATES } from '@stamina/domain';
import { Locale } from '@stamina/i18n';
import { describe, expect, it } from 'vitest';
import type { ReadyNutrition } from '../types.ts';
import { toMealView } from './to-meal-view.ts';

const template = TEMPLATES[0]!;
const idea = {
  templateId: template.id,
  portions: template.ingredients.map(({ ingredientId, grams }) => ({ ingredientId, grams })),
  kcal: 450,
  proteinG: 28,
  carbsG: 52,
  fatG: 14,
};
const meal = (overrides: Partial<ReadyNutrition['meals'][number]>) => ({
  slot: MealSlot.Breakfast,
  at: 480,
  idea,
  status: null,
  ...overrides,
});

describe('toMealView', () => {
  it('names the dish and writes each portion in the reader language', () => {
    const view = toMealView(meal({}), 2, Locale.El);

    expect(view.index).toBe(2);
    expect(view.time).toBe('08:00');
    expect(view.title).toBe(template.names.el);
    expect(view.portions).toHaveLength(template.ingredients.length);
    expect(view.macros).toEqual({ kcal: 450, proteinG: 28, carbsG: 52, fatG: 14 });
  });

  it('carries the logged status', () => {
    expect(toMealView(meal({ status: MealLogStatus.Ate }), 0, Locale.En).status).toBe(
      MealLogStatus.Ate,
    );
  });

  it('has no title, portions or macros without an idea', () => {
    const view = toMealView(meal({ idea: null }), 0, Locale.En);

    expect(view.title).toBeUndefined();
    expect(view.portions).toEqual([]);
    expect(view.macros).toBeUndefined();
  });

  it('leaves out an ingredient this version does not know', () => {
    const view = toMealView(
      meal({
        idea: { ...idea, portions: [...idea.portions, { ingredientId: 'not-a-food', grams: 50 }] },
      }),
      0,
      Locale.En,
    );

    expect(view.portions).toHaveLength(template.ingredients.length);
  });

  it('treats an idea for a dish this version does not know as no idea', () => {
    const view = toMealView(meal({ idea: { ...idea, templateId: 'not-a-dish' } }), 0, Locale.En);

    expect(view.title).toBeUndefined();
    expect(view.portions).toEqual([]);
  });
});
