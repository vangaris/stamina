import { NutritionStatus, type NutritionMeal } from '@stamina/contracts';
import {
  Allergen,
  CookingEffort,
  EatingPattern,
  MAX_MEALS_PER_DAY,
  MIN_MEALS_PER_DAY,
  MealSlot,
  Origin,
  MIN_PORTION_GRAMS,
  PORTION_ROUND_GRAMS,
  SMALL_PORTION_BELOW_GRAMS,
  TEMPLATE_SCALE_MAX,
  TEMPLATE_SCALE_MIN,
  addDays,
  eligibleTemplates,
  getIngredient,
  getTemplate,
  TEMPLATES,
  originsAllowedBy,
  slotTargets,
  templateAllergens,
  templateOrigins,
} from '@stamina/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { EXERCISE_DATA_DIR } from '../src/exercises/node.ts';
import {
  foodUser,
  getNutrition,
  getReady,
  putSetup,
  setupOf,
} from './support/nutrition-fixtures.ts';
import type { FixtureUser, TestApi } from './support/safety-fixtures.ts';
import { createScratchDatabase, type ScratchDatabase } from './support/scratch-database.ts';
import { startTestApi } from './support/test-api.ts';

/** The server's clock is after every date asked for, so all of them are days it accepts. */
const NOW = new Date('2026-11-30T12:00:00.000Z');
const FIRST_DATE = '2026-11-01';
const DAYS = 14;
const dates = Array.from({ length: DAYS }, (_, index) => addDays(FIRST_DATE, index));

const MEAL_COUNTS = Array.from(
  { length: MAX_MEALS_PER_DAY - MIN_MEALS_PER_DAY + 1 },
  (_, index) => MIN_MEALS_PER_DAY + index,
);

const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

describe('Meal ideas on Meals', () => {
  let api: TestApi;
  let scratch: ScratchDatabase;

  beforeAll(async () => {
    scratch = await createScratchDatabase(EXERCISE_DATA_DIR);
    api = await startTestApi({ databaseUrl: scratch.url, now: () => NOW });
  });
  afterAll(async () => {
    await api.close();
    await scratch.drop();
  });

  /** The meals of every date, in date order, for the person's current setup. */
  const mealsOnEveryDate = (user: FixtureUser) =>
    Promise.all(dates.map(async (date) => ({ ...(await getReady(user, date)), date })));

  /** Asserts one meal's idea respects the person's food rules, judged from the ingredient data. */
  const expectCleanIdea = (
    meal: NutritionMeal,
    person: { pattern: EatingPattern; allergens: readonly Allergen[] },
  ) => {
    const { idea } = meal;
    expect(idea).not.toBeNull();
    const template = getTemplate(idea!.templateId);
    expect(template).toBeDefined();
    expect(template!.slot).toBe(meal.slot);
    expect(idea!.portions.map((portion) => portion.ingredientId)).toEqual(
      template!.ingredients.map((ingredient) => ingredient.ingredientId),
    );
    const allowed = originsAllowedBy(person.pattern);
    for (const origin of templateOrigins(template!)) expect(allowed).toContain(origin);
    for (const allergen of person.allergens) {
      expect(templateAllergens(template!)).not.toContain(allergen);
      for (const { ingredientId } of idea!.portions) {
        expect(getIngredient(ingredientId)!.allergens).not.toContain(allergen);
      }
    }
  };

  describe('a vegan allergic to tree nuts', () => {
    it('never gets tree nuts or an animal product, in any slot of any day, for every meals-per-day', async () => {
      const user = await foodUser(api);

      for (const mealsPerDay of MEAL_COUNTS) {
        await putSetup(
          user,
          setupOf({
            eatingPattern: EatingPattern.Vegan,
            allergens: [Allergen.TreeNuts],
            mealsPerDay,
          }),
        );

        for (const { meals } of await mealsOnEveryDate(user)) {
          expect(meals).toHaveLength(mealsPerDay);
          for (const meal of meals) {
            expectCleanIdea(meal, {
              pattern: EatingPattern.Vegan,
              allergens: [Allergen.TreeNuts],
            });
            const template = getTemplate(meal.idea!.templateId)!;
            expect(templateAllergens(template)).not.toContain(Allergen.TreeNuts);
            expect(templateOrigins(template).filter((origin) => origin !== Origin.Plant)).toEqual(
              [],
            );
          }
        }
      }
    });
  });

  describe('every single allergen under every eating pattern', () => {
    it('never gets the allergen, never gets food the pattern rules out, and always has something to eat', async () => {
      const user = await foodUser(api);

      for (const pattern of Object.values(EatingPattern)) {
        for (const allergen of Object.values(Allergen)) {
          await putSetup(
            user,
            setupOf({ eatingPattern: pattern, allergens: [allergen], mealsPerDay: 5 }),
          );

          for (const { meals } of await mealsOnEveryDate(user)) {
            expect(meals).toHaveLength(MAX_MEALS_PER_DAY);
            for (const meal of meals) {
              expectCleanIdea(meal, { pattern, allergens: [allergen] });
            }
          }
        }
      }
    }, 180_000);
  });

  describe('several allergens at once', () => {
    it('gives a clean idea or none, and still shows the day', async () => {
      const user = await foodUser(api);
      const people = [
        [Allergen.Gluten, Allergen.Milk, Allergen.Eggs],
        [Allergen.TreeNuts, Allergen.Peanuts, Allergen.Sesame, Allergen.Soybeans],
        [Allergen.Fish, Allergen.Crustaceans, Allergen.Molluscs, Allergen.Celery, Allergen.Mustard],
        Object.values(Allergen),
      ];

      for (const [index, allergens] of people.entries()) {
        const pattern = Object.values(EatingPattern)[index % 4]!;
        await putSetup(user, setupOf({ eatingPattern: pattern, allergens, mealsPerDay: 5 }));

        for (const { meals, targets } of await mealsOnEveryDate(user)) {
          expect(targets.energyKcal).toBeGreaterThan(0);
          expect(meals).toHaveLength(MAX_MEALS_PER_DAY);
          for (const meal of meals) {
            if (meal.idea === null) continue;
            expectCleanIdea(meal, { pattern, allergens });
          }
        }
      }
    }, 120_000);

    it('gives no idea, and no invented food, when every template of a slot is ruled out', async () => {
      const user = await foodUser(api);
      // Every name has an "e", an "α" or an "ο": a dislike set that no template survives.
      await putSetup(user, setupOf({ dislikes: ['e', 'α', 'ο'], mealsPerDay: 5 }));

      const ready = await getReady(user, FIRST_DATE);

      expect(ready.targets.energyKcal).toBeGreaterThan(0);
      expect(ready.meals.map(({ idea }) => idea)).toEqual([null, null, null, null, null]);
    });
  });

  describe('dislikes', () => {
    it('leave out every template that names the disliked food, in English and in Greek', async () => {
      const user = await foodUser(api);
      await putSetup(user, setupOf({ mealsPerDay: 5 }));
      const baseline = await mealsOnEveryDate(user);
      const first = baseline[0]!.meals[0]!.idea!;
      const ingredient = getIngredient(first.portions[0]!.ingredientId)!;
      const english = ingredient.names.en.slice(0, 40).toUpperCase();
      const greek = fold(ingredient.names.el).slice(0, 40);
      const namesOf = (templateId: string) => {
        const template = getTemplate(templateId)!;
        return [
          template.names.en,
          template.names.el,
          ...template.ingredients.flatMap(({ ingredientId }) => {
            const { names } = getIngredient(ingredientId)!;
            return [names.en, names.el];
          }),
        ].map(fold);
      };
      expect(
        baseline.some(({ meals }) =>
          meals.some((meal) =>
            namesOf(meal.idea!.templateId).some((name) => name.includes(fold(english))),
          ),
        ),
      ).toBe(true);

      for (const dislike of [english, greek.toUpperCase()]) {
        await putSetup(user, setupOf({ mealsPerDay: 5, dislikes: [dislike] }));

        for (const { meals } of await mealsOnEveryDate(user)) {
          for (const meal of meals) {
            if (meal.idea === null) continue;
            expect(
              namesOf(meal.idea.templateId).filter((name) => name.includes(fold(dislike))),
            ).toEqual([]);
          }
        }
      }
    });

    it('read a plural as the singular food, in English and in Greek', async () => {
      const user = await foodUser(api);
      const eggIds = ['egg-whole-raw', 'egg-boiled'];
      const usesAny = (templateId: string, ingredientIds: readonly string[]) =>
        getTemplate(templateId)!.ingredients.some(({ ingredientId }) =>
          ingredientIds.includes(ingredientId),
        );
      const everything = { pattern: EatingPattern.Everything, allergens: [], dislikes: [] };
      const cases: [dislike: string, ingredientIds: string[]][] = [
        ['eggs', eggIds],
        ['αυγά', eggIds],
        ['tomatoes', ['tomato']],
        ['ντομάτες', ['tomato']],
        ['onions', ['onion', 'onion-red']],
        ['apples', ['apple']],
        ['μήλα', ['apple']],
      ];

      for (const [dislike, ingredientIds] of cases) {
        // The omelette and boiled-egg templates are among those that use the disliked food.
        const using = TEMPLATES.filter((template) => usesAny(template.id, ingredientIds));
        expect(using.length).toBeGreaterThan(0);
        for (const slot of Object.values(MealSlot)) {
          const eligible = eligibleTemplates({ ...everything, dislikes: [dislike] }, slot);
          expect(eligible.filter((template) => usesAny(template.id, ingredientIds))).toEqual([]);
        }

        await putSetup(user, setupOf({ mealsPerDay: 5, dislikes: [dislike] }));
        for (const { meals } of await mealsOnEveryDate(user)) {
          for (const meal of meals) {
            expect(usesAny(meal.idea!.templateId, ingredientIds)).toBe(false);
          }
        }
      }

      const eggTemplateNames = TEMPLATES.filter((template) => usesAny(template.id, eggIds)).map(
        ({ names }) => names.en,
      );
      expect(eggTemplateNames.some((name) => /omelette/i.test(name))).toBe(true);
      expect(eggTemplateNames.some((name) => /boiled egg/i.test(name))).toBe(true);
    });

    it('reads a plural as the head noun only: olives are not olive oil', () => {
      const usesAny = (templateId: string, ingredientId: string) =>
        getTemplate(templateId)!.ingredients.some((item) => item.ingredientId === ingredientId);
      const withOlives = TEMPLATES.filter((template) => usesAny(template.id, 'kalamata-olives'));
      const oilOnly = TEMPLATES.filter(
        (template) =>
          usesAny(template.id, 'olive-oil') &&
          !template.ingredients.some(({ ingredientId }) => /olives/.test(ingredientId)) &&
          !/olive/i.test(template.names.en),
      );
      expect(withOlives.length).toBeGreaterThan(0);
      expect(oilOnly.length).toBeGreaterThan(0);

      const everything = { pattern: EatingPattern.Everything, allergens: [], dislikes: ['olives'] };
      const eligibleIds = new Set<string>();
      for (const slot of Object.values(MealSlot)) {
        for (const template of eligibleTemplates(everything, slot)) eligibleIds.add(template.id);
      }
      const survivors = (list: typeof TEMPLATES) =>
        list.filter((template) => eligibleIds.has(template.id));
      expect(survivors(withOlives)).toEqual([]);
      expect(survivors(oilOnly).length).toBeGreaterThan(0);
    });
  });

  describe('scaling to the slot', () => {
    it('stays inside the clamp, moves the template toward the slot targets, and reports the macros of the rounded portions', async () => {
      const user = await foodUser(api);

      for (const mealsPerDay of MEAL_COUNTS) {
        await putSetup(user, setupOf({ mealsPerDay }));

        for (const { meals, targets } of await mealsOnEveryDate(user)) {
          const slots = slotTargets(targets, mealsPerDay);
          expect(slots).toHaveLength(mealsPerDay);

          for (const [index, meal] of meals.entries()) {
            const target = slots[index]!;
            const idea = meal.idea!;
            const template = getTemplate(idea.templateId)!;
            expect(target.slot).toBe(meal.slot);

            // Every amount is the template's amount times one factor inside the clamp: the nearest
            // gram below 10 g (never under 1 g), the nearest 5 g from there up.
            const half = PORTION_ROUND_GRAMS / 2;
            for (const [position, portion] of idea.portions.entries()) {
              const base = template.ingredients[position]!.grams;
              expect(portion.grams).toBeGreaterThanOrEqual(MIN_PORTION_GRAMS);
              expect(portion.grams).toBeGreaterThanOrEqual(base * TEMPLATE_SCALE_MIN - half);
              expect(portion.grams).toBeLessThanOrEqual(base * TEMPLATE_SCALE_MAX + half);
              if (portion.grams >= SMALL_PORTION_BELOW_GRAMS) {
                expect(portion.grams % PORTION_ROUND_GRAMS).toBe(0);
              }
            }

            // The idea's numbers are those of its rounded portions.
            const total = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };
            const unscaled = { proteinG: 0, carbsG: 0 };
            for (const [position, portion] of idea.portions.entries()) {
              const { per100g } = getIngredient(portion.ingredientId)!;
              total.kcal += (per100g.kcal * portion.grams) / 100;
              total.proteinG += (per100g.proteinG * portion.grams) / 100;
              total.carbsG += (per100g.carbsG * portion.grams) / 100;
              total.fatG += (per100g.fatG * portion.grams) / 100;
              const base = template.ingredients[position]!.grams;
              unscaled.proteinG += (per100g.proteinG * base) / 100;
              unscaled.carbsG += (per100g.carbsG * base) / 100;
            }
            expect(idea.kcal).toBe(Math.round(total.kcal));
            expect(idea.proteinG).toBe(Math.round(total.proteinG));
            expect(idea.carbsG).toBe(Math.round(total.carbsG));
            expect(idea.fatG).toBe(Math.round(total.fatG));

            // One factor, chosen to get protein and carbs as near the slot as the clamp allows, so
            // no further away than the template as written (factor 1 is inside the clamp), plus what
            // rounding every amount to 5 g can move the numbers by.
            const proteinTarget = Math.max(target.proteinG, 1);
            const carbsTarget = Math.max(target.carbsG, 1);
            const relativeError = (protein: number, carbs: number) =>
              Math.abs(protein - proteinTarget) / proteinTarget +
              Math.abs(carbs - carbsTarget) / carbsTarget;
            const roundingSlack = idea.portions.reduce((sum, { ingredientId }) => {
              const { per100g } = getIngredient(ingredientId)!;
              return (
                sum +
                (PORTION_ROUND_GRAMS * per100g.proteinG) / 100 / proteinTarget +
                (PORTION_ROUND_GRAMS * per100g.carbsG) / 100 / carbsTarget
              );
            }, 0);
            expect(relativeError(total.proteinG, total.carbsG)).toBeLessThanOrEqual(
              relativeError(unscaled.proteinG, unscaled.carbsG) + roundingSlack + 1e-9,
            );
          }
        }
      }
    }, 120_000);
  });

  describe('selection', () => {
    it('gives the two snacks of a five-meal day different dishes, every day, at normal effort', async () => {
      const user = await foodUser(api);
      await putSetup(
        user,
        setupOf({
          eatingPattern: EatingPattern.Pescatarian,
          cookingEffort: CookingEffort.Normal,
          mealsPerDay: 5,
        }),
      );

      for (const { meals } of await mealsOnEveryDate(user)) {
        const snacks = meals.filter(({ slot }) => slot === MealSlot.Snack);
        expect(snacks).toHaveLength(2);
        expect(snacks[0]!.idea!.templateId).not.toBe(snacks[1]!.idea!.templateId);
      }
    });

    it('never repeats a dish within a day while another fits, at every effort and meal count', async () => {
      const user = await foodUser(api);

      for (const cookingEffort of Object.values(CookingEffort)) {
        for (const mealsPerDay of MEAL_COUNTS) {
          await putSetup(user, setupOf({ cookingEffort, mealsPerDay }));
          for (const { meals } of await mealsOnEveryDate(user)) {
            const ids = meals.map(({ idea }) => idea!.templateId);
            expect(new Set(ids).size).toBe(ids.length);
          }
        }
      }
    }, 120_000);

    it('is stable for the same day and the same person', async () => {
      const user = await foodUser(api, { mealsPerDay: 5 });

      const first = await getReady(user, FIRST_DATE);
      const second = await getReady(user, FIRST_DATE);

      expect(second.meals).toEqual(first.meals);
    });

    it('rotates across days', async () => {
      const user = await foodUser(api, { mealsPerDay: 3 });

      const days = await mealsOnEveryDate(user);

      for (const index of [0, 1, 2]) {
        const used = new Set(days.map(({ meals }) => meals[index]!.idea!.templateId));
        expect(used.size).toBeGreaterThan(1);
      }
    });

    it('is the same for two people with the same setup', async () => {
      const [one, two] = await Promise.all([foodUser(api), foodUser(api)]);

      expect((await getReady(one, FIRST_DATE)).meals).toEqual(
        (await getReady(two, FIRST_DATE)).meals,
      );
    });

    it('prefers the person’s cooking effort whenever a template of that effort fits', async () => {
      const user = await foodUser(api);
      const person = {
        pattern: EatingPattern.Vegetarian,
        allergens: [Allergen.Gluten],
        dislikes: [],
      };

      for (const effort of Object.values(CookingEffort)) {
        await putSetup(
          user,
          setupOf({
            eatingPattern: person.pattern,
            allergens: person.allergens,
            cookingEffort: effort,
            mealsPerDay: 5,
          }),
        );

        let preferred = 0;
        for (const { meals } of await mealsOnEveryDate(user)) {
          for (const meal of meals) {
            const fits = eligibleTemplates(person, meal.slot).some(
              (template) => template.effort === effort,
            );
            const picked = getTemplate(meal.idea!.templateId)!;
            if (fits) {
              expect(picked.effort).toBe(effort);
              preferred += 1;
            }
          }
        }
        expect(preferred).toBeGreaterThan(0);
      }
    });
  });

  describe('the day around the ideas', () => {
    it('keeps the slot kinds and times, with snacks as snacks', async () => {
      const user = await foodUser(api, { mealsPerDay: 5 });

      const { meals } = await getReady(user, FIRST_DATE);

      expect(meals.map(({ slot }) => slot)).toEqual([
        MealSlot.Breakfast,
        MealSlot.Snack,
        MealSlot.Lunch,
        MealSlot.Snack,
        MealSlot.Dinner,
      ]);
      expect(meals.map(({ status }) => status)).toEqual([null, null, null, null, null]);
    });

    it('sends no names, measures or units: only ids and grams', async () => {
      const user = await foodUser(api);

      const state = await getNutrition(user, FIRST_DATE);

      expect(state.status).toBe(NutritionStatus.Ready);
      const idea = state.status === NutritionStatus.Ready ? state.meals[0]!.idea! : null;
      expect(Object.keys(idea!).sort()).toEqual(
        ['carbsG', 'fatG', 'kcal', 'portions', 'proteinG', 'templateId'].sort(),
      );
      for (const portion of idea!.portions) {
        expect(Object.keys(portion).sort()).toEqual(['grams', 'ingredientId']);
      }
    });
  });
});
