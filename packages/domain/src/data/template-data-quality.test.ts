import { describe, expect, it } from 'vitest';
import { Allergen } from '../enums/allergen.ts';
import { CookingEffort } from '../enums/cooking-effort.ts';
import { EatingPattern } from '../enums/eating-pattern.ts';
import { MealSlot } from '../enums/meal-slot.ts';
import { Origin } from '../enums/origin.ts';
import type { MealTemplate } from '../types.ts';
import { getIngredient } from '../utils/get-ingredient.ts';
import { templateAllergens } from '../utils/template-allergens.ts';
import { templateOrigins } from '../utils/template-origins.ts';
import everything from './templates/everything.json' with { type: 'json' };
import pescatarian from './templates/pescatarian.json' with { type: 'json' };
import vegan from './templates/vegan.json' with { type: 'json' };
import vegetarian from './templates/vegetarian.json' with { type: 'json' };
import { TEMPLATES } from './templates.ts';

const FILES: Record<EatingPattern, unknown[]> = {
  [EatingPattern.Everything]: everything,
  [EatingPattern.Pescatarian]: pescatarian,
  [EatingPattern.Vegetarian]: vegetarian,
  [EatingPattern.Vegan]: vegan,
};

const PER_SLOT: Record<MealSlot, number> = {
  [MealSlot.Breakfast]: 3,
  [MealSlot.Lunch]: 3,
  [MealSlot.Dinner]: 3,
  [MealSlot.Snack]: 6,
};
/** The typical energy of a template's base amounts by slot kind, with a small margin. */
const KCAL_RANGE: Record<MealSlot, { min: number; max: number }> = {
  [MealSlot.Breakfast]: { min: 360, max: 540 },
  [MealSlot.Lunch]: { min: 500, max: 740 },
  [MealSlot.Dinner]: { min: 500, max: 740 },
  [MealSlot.Snack]: { min: 130, max: 280 },
};
const MEAT_AND_SEAFOOD: readonly Origin[] = [Origin.Meat, Origin.Seafood];
const GREEK = /[\u0370-\u03FF\u1F00-\u1FFF]/;
const SUPPLEMENT_WORDS =
  /protein (powder|shake|bar|isolate)|creatine|vitamin|supplement|collagen|bcaa|pre-workout|capsule|tablet|probiotic|fish oil|energy (gel|drink)|spirulina|multivitamin/i;

function baseKcal(template: MealTemplate): number {
  return template.ingredients.reduce(
    (sum, { ingredientId, grams }) =>
      sum + ((getIngredient(ingredientId)?.per100g.kcal ?? 0) * grams) / 100,
    0,
  );
}

function group(pattern: EatingPattern): MealTemplate[] {
  return TEMPLATES.filter((template) => template.pattern === pattern);
}

describe('template data', () => {
  it('holds 60 templates with unique ids', () => {
    expect(TEMPLATES).toHaveLength(60);
    expect(new Set(TEMPLATES.map((template) => template.id)).size).toBe(60);
  });

  for (const pattern of Object.values(EatingPattern)) {
    describe(`${pattern} group`, () => {
      const templates = group(pattern);

      it('has its own file with 15 templates split 3/3/3/6 by slot kind', () => {
        expect(FILES[pattern]).toHaveLength(15);
        expect(templates).toHaveLength(15);
        for (const slot of Object.values(MealSlot)) {
          expect(templates.filter((template) => template.slot === slot)).toHaveLength(
            PER_SLOT[slot],
          );
        }
      });

      it('numbers ids <pattern>-<slot>-<n> from 1 within the slot kind', () => {
        for (const slot of Object.values(MealSlot)) {
          const ids = templates
            .filter((template) => template.slot === slot)
            .map((template) => template.id);
          expect(ids.slice().sort()).toEqual(
            Array.from({ length: PER_SLOT[slot] }, (_, index) => `${pattern}-${slot}-${index + 1}`),
          );
        }
      });

      it('keeps its promise about animal foods', () => {
        for (const template of templates) {
          const origins = templateOrigins(template);
          if (pattern === EatingPattern.Vegan) expect(origins, template.id).toEqual([Origin.Plant]);
          if (pattern === EatingPattern.Vegetarian) {
            expect(
              origins.filter((o) => MEAT_AND_SEAFOOD.includes(o)),
              template.id,
            ).toEqual([]);
          }
          if (pattern === EatingPattern.Pescatarian) {
            expect(origins.includes(Origin.Meat), template.id).toBe(false);
          }
        }
      });

      for (const slot of Object.values(MealSlot)) {
        it(`has a ${slot} free of each single allergen`, () => {
          const inSlot = templates.filter((template) => template.slot === slot);
          for (const allergen of Object.values(Allergen)) {
            expect(
              inSlot.some((template) => !templateAllergens(template).includes(allergen)),
              `${pattern} ${slot} free of ${allergen}`,
            ).toBe(true);
          }
        });
      }
    });
  }

  describe.each(TEMPLATES.map((template) => [template.id, template] as const))(
    '%s',
    (_id, template) => {
      it('has a valid shape', () => {
        expect(Object.keys(template).sort()).toEqual([
          'effort',
          'id',
          'ingredients',
          'names',
          'pattern',
          'slot',
        ]);
        expect(Object.values(EatingPattern)).toContain(template.pattern);
        expect(Object.values(MealSlot)).toContain(template.slot);
        expect(Object.values(CookingEffort)).toContain(template.effort);
        expect(template.id.startsWith(`${template.pattern}-${template.slot}-`)).toBe(true);
      });

      it('has natural names in both languages', () => {
        expect(template.names.en.trim().length).toBeGreaterThan(2);
        expect(template.names.el.trim().length).toBeGreaterThan(2);
        expect(GREEK.test(template.names.el)).toBe(true);
        expect(GREEK.test(template.names.en)).toBe(false);
        expect(SUPPLEMENT_WORDS.test(`${template.names.en} ${template.names.el}`)).toBe(false);
      });

      it('lists known ingredients once each at a positive amount', () => {
        expect(template.ingredients.length).toBeGreaterThanOrEqual(2);
        for (const { ingredientId, grams } of template.ingredients) {
          expect(getIngredient(ingredientId), ingredientId).toBeDefined();
          expect(Number.isFinite(grams) && grams > 0, `${ingredientId} grams`).toBe(true);
        }
        const ids = template.ingredients.map((ingredient) => ingredient.ingredientId);
        expect(new Set(ids).size).toBe(ids.length);
      });

      it('has a base energy typical for its slot', () => {
        const { min, max } = KCAL_RANGE[template.slot];
        const kcal = baseKcal(template);
        expect(kcal).toBeGreaterThanOrEqual(min);
        expect(kcal).toBeLessThanOrEqual(max);
      });
    },
  );
});
