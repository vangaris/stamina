import { describe, expect, it } from 'vitest';
import { Origin } from '../enums/origin.ts';
import type { Ingredient, NameLocale } from '../types.ts';
import { describePortion } from './describe-portion.ts';
import { getIngredient } from './get-ingredient.ts';

const HONEY: Ingredient = {
  id: 'test-honey',
  origin: Origin.Honey,
  names: { en: 'Honey', el: 'Μέλι' },
  allergens: [],
  per100g: { kcal: 304, proteinG: 0.3, carbsG: 82, fatG: 0 },
  units: [
    {
      grams: 20,
      names: {
        en: { one: 'tablespoon', other: 'tablespoons' },
        el: { one: 'κουταλιά της σούπας', other: 'κουταλιές της σούπας' },
      },
    },
  ],
};

describe('describePortion', () => {
  it('words a whole number of units in English', () => {
    expect(describePortion(HONEY, 40, 'en')).toEqual({
      text: '2 tablespoons (40 g)',
      line: '2 tablespoons honey (40 g)',
      units: 2,
      unit: 'tablespoons',
    });
    expect(describePortion(HONEY, 20, 'en')).toEqual({
      text: '1 tablespoon (20 g)',
      line: '1 tablespoon honey (20 g)',
      units: 1,
      unit: 'tablespoon',
    });
  });

  it('words the same amount in Greek with a decimal comma', () => {
    expect(describePortion(HONEY, 30, 'el')).toEqual({
      text: '1,5 κουταλιές της σούπας (30 g)',
      line: '1,5 κουταλιές της σούπας μέλι (30 g)',
      units: 1.5,
      unit: 'κουταλιές της σούπας',
    });
    expect(describePortion(HONEY, 20, 'el').text).toBe('1 κουταλιά της σούπας (20 g)');
  });

  it('rounds to the nearest half unit', () => {
    expect(describePortion(HONEY, 33, 'en').units).toBe(1.5);
    expect(describePortion(HONEY, 47, 'en').units).toBe(2.5);
  });

  it('keeps half a unit as the smallest household amount', () => {
    expect(describePortion(HONEY, 10, 'en').units).toBe(0.5);
  });

  it('falls back to grams when the amount is under half a unit, and the line names the food', () => {
    expect(describePortion(HONEY, 6, 'en')).toEqual({
      text: '6 g',
      line: '6 g honey',
      units: 6,
      unit: 'g',
    });
    expect(describePortion(HONEY, 6, 'el').line).toBe('6 g μέλι');
  });
});

describe('describePortion line on the bundled food', () => {
  const line = (id: string, grams: number, locale: NameLocale) =>
    describePortion(getIngredient(id)!, grams, locale).line;

  it('puts the food after a household measure that does not name it', () => {
    expect(line('olive-oil', 20, 'en')).toBe('1.5 tablespoons olive oil (20 g)');
    expect(line('olive-oil', 20, 'el')).toBe('1,5 κουταλιές της σούπας ελαιόλαδο (20 g)');
    expect(line('olive-oil', 1, 'en')).toBe('1 g olive oil');
    expect(line('olive-oil', 1, 'el')).toBe('1 g ελαιόλαδο');
  });

  const COUNTABLE: [id: string, grams: number, en: string, el: string][] = [
    ['egg-whole-raw', 125, '2.5 eggs (125 g)', '2,5 αυγά (125 g)'],
    ['egg-boiled', 100, '2 eggs (100 g)', '2 αυγά (100 g)'],
    ['tomato', 180, '1.5 medium tomatoes (180 g)', '1,5 ντομάτες (180 g)'],
    ['onion', 110, '1 medium onion (110 g)', '1 κρεμμύδι (110 g)'],
    ['onion-red', 165, '1.5 medium onions (165 g)', '1,5 κρεμμύδια (165 g)'],
    ['carrot', 70, '1 medium carrot (70 g)', '1 καρότο (70 g)'],
    ['potato-boiled', 225, '1.5 medium potatoes (225 g)', '1,5 μέτριες πατάτες (225 g)'],
    ['potato-baked', 255, '1.5 medium baked potatoes (255 g)', '1,5 μέτριες ψητές πατάτες (255 g)'],
    ['rice-cakes', 27, '3 rice cakes (27 g)', '3 ρυζογκοφρέτες (27 g)'],
    ['prawns-cooked', 50, '5 prawns (50 g)', '5 γαρίδες (50 g)'],
    ['wheat-tortilla-wrap', 90, '1.5 tortillas (90 g)', '1,5 τορτίγιες (90 g)'],
    ['pitta-bread', 60, '1 pitta (60 g)', '1 πίτα (60 g)'],
    ['crackers-plain', 18, '3 crackers (18 g)', '3 κράκερ (18 g)'],
  ];

  it.each(COUNTABLE)('does not repeat the food when the unit names it: %s', (id, grams, en, el) => {
    expect(line(id, grams, 'en')).toBe(en);
    expect(line(id, grams, 'el')).toBe(el);
  });

  const NAMED: [id: string, grams: number, en: string, el: string][] = [
    [
      'tuna-canned-oil',
      165,
      '1.5 cans tuna, canned in oil, drained (165 g)',
      '1,5 κουτιά τόνος κονσέρβα σε λάδι, στραγγισμένος (165 g)',
    ],
    [
      'tuna-canned-water',
      110,
      '1 can tuna, canned in water, drained (110 g)',
      '1 κουτί τόνος κονσέρβα σε νερό, στραγγισμένος (110 g)',
    ],
    [
      'canned-chopped-tomatoes',
      600,
      '1.5 cans canned chopped tomatoes (600 g)',
      '1,5 κονσέρβες ντομάτες ψιλοκομμένες, κονσέρβα (600 g)',
    ],
  ];

  it.each(NAMED)('names the food when the unit is only a container: %s', (id, grams, en, el) => {
    expect(line(id, grams, 'en')).toBe(en);
    expect(line(id, grams, 'el')).toBe(el);
  });
});
