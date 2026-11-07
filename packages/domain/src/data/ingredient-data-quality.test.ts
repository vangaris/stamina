import { describe, expect, it } from 'vitest';
import { Allergen } from '../enums/allergen.ts';
import { Origin } from '../enums/origin.ts';
import type { Ingredient } from '../types.ts';
import animalFoodsAndDrinks from './ingredients/animal-foods-and-drinks.json' with { type: 'json' };
import grainsAndStarches from './ingredients/grains-and-starches.json' with { type: 'json' };
import plantProteinsFatsAndPantry from './ingredients/plant-proteins-fats-and-pantry.json' with { type: 'json' };
import vegetablesAndFruit from './ingredients/vegetables-and-fruit.json' with { type: 'json' };
import { INGREDIENTS } from './ingredients.ts';

const GROUPS: { name: string; items: unknown[]; min: number; max: number }[] = [
  { name: 'grains-and-starches', items: grainsAndStarches, min: 50, max: 70 },
  { name: 'vegetables-and-fruit', items: vegetablesAndFruit, min: 62, max: 90 },
  { name: 'plant-proteins-fats-and-pantry', items: plantProteinsFatsAndPantry, min: 56, max: 85 },
  { name: 'animal-foods-and-drinks', items: animalFoodsAndDrinks, min: 56, max: 85 },
];

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const GREEK = /[\u0370-\u03FF\u1F00-\u1FFF]/;
const ALLERGENS = new Set<string>(Object.values(Allergen));
const ORIGINS = new Set<string>(Object.values(Origin));
const KCAL_TOLERANCE = 0.15;
/** Low-energy vegetables: published energy discounts fibre, which the macro sum counts in full. */
const LOW_ENERGY_KCAL = 60;
const LOW_ENERGY_KCAL_TOLERANCE = 0.25;
const KCAL_CHECK_FROM = 20;

const SUPPLEMENT_WORDS =
  /protein (powder|shake|bar|isolate)|creatine|vitamin|supplement|collagen|bcaa|pre-workout|capsule|tablet|probiotic|fish oil|energy (gel|drink)|spirulina|multivitamin/i;

interface AllergenRule {
  label: string;
  allergen: Allergen;
  match: RegExp;
  except?: RegExp;
}

const PLANT_MILK_QUALIFIER =
  /almond|oat|soy|coconut|rice|peanut|cashew|hazelnut|walnut|nut\b|sesame|tahini|seeds?\b|cocoa|cacao|shea|pea\b|hemp|plant|vegan|apple|sunflower|pistachio|butternut|beans?\b|lettuce|cream of tartar/i;
const GLUTEN_FREE_QUALIFIER =
  /gluten[- ]free|rice|corn|chickpea|gram flour|almond|coconut|buckwheat|potato|tapioca|cassava|soy|lupin|millet|quinoa/i;

const ALLERGEN_RULES: AllergenRule[] = [
  {
    label: 'gluten',
    allergen: Allergen.Gluten,
    match:
      /\b(wheat|barley|rye|oats?|oatmeal|spelt|bread|breadcrumbs?|pasta|couscous|bulgur|bulghur|semolina|seitan|freekeh|farro|crackers?|pitas?|noodles?|rusks?|muesli|granola|tortillas?|wraps?|orzo|spaghetti|macaroni|penne|filo|phyllo|bagels?|croissants?|biscuits?|crispbread|flour)\b/i,
    except: GLUTEN_FREE_QUALIFIER,
  },
  {
    label: 'milk',
    allergen: Allergen.Milk,
    match:
      /\b(milk|butter|buttermilk|cheese|yoghurt|yogurt|cream|whey|kefir|feta|halloumi|mozzarella|parmesan|ricotta|mizithra|manouri|kefalotyri|graviera|ghee|custard|casein|paneer|mascarpone|skyr|labneh)\b/i,
    except: PLANT_MILK_QUALIFIER,
  },
  { label: 'eggs', allergen: Allergen.Eggs, match: /\b(eggs?|mayonnaise|mayo)\b/i, except: /egg-free/i },
  {
    label: 'fish',
    allergen: Allergen.Fish,
    match:
      /\b(fish|salmon|tuna|cod|sardines?|anchov(y|ies)|mackerel|trout|bass|bream|herring|haddock|hake|taramas?|taramosalata|caviar|roe)\b/i,
    except: /oyster mushroom/i,
  },
  {
    label: 'crustaceans',
    allergen: Allergen.Crustaceans,
    match: /\b(shrimps?|prawns?|crabs?|lobsters?|crayfish|langoustines?)\b/i,
    except: /crab apple/i,
  },
  {
    label: 'molluscs',
    allergen: Allergen.Molluscs,
    match: /\b(mussels?|oysters?|clams?|squid|octopus|calamari|cuttlefish|scallops?|snails?)\b/i,
    except: /oyster mushroom/i,
  },
  {
    label: 'tree nuts',
    allergen: Allergen.TreeNuts,
    match: /\b(almonds?|walnuts?|hazelnuts?|cashews?|pistachios?|pecans?|brazil nuts?|macadamias?|praline|marzipan)\b/i,
  },
  { label: 'peanuts', allergen: Allergen.Peanuts, match: /\b(peanuts?|groundnuts?)\b/i },
  { label: 'sesame', allergen: Allergen.Sesame, match: /\b(sesame|tahini|tahin|halva|halvas)\b/i },
  { label: 'soybeans', allergen: Allergen.Soybeans, match: /\b(soy|soya|soybeans?|tofu|tempeh|edamame|miso)\b/i },
  { label: 'mustard', allergen: Allergen.Mustard, match: /\bmustard\b/i },
  { label: 'celery', allergen: Allergen.Celery, match: /\b(celery|celeriac)\b/i },
  { label: 'lupin', allergen: Allergen.Lupin, match: /\blupin(s|i)?\b/i },
  {
    label: 'sulphites',
    allergen: Allergen.Sulphites,
    match: /\b(raisins?|sultanas?|dried apricots?|wine vinegar|balsamic)\b/i,
  },
];

const MEAT_WORDS =
  /\b(chicken|turkey|beef|pork|lamb|veal|ham|bacon|sausages?|duck|rabbit|liver|kebab|gyros|souvlaki|prosciutto|salami|mortadella|steak|venison)\b/i;
const MEAT_EXCEPT = /lamb's lettuce|beef tomato|beefsteak tomato|vegan|plant-based|plant based|tuna|salmon|swordfish|fish/i;
const SEAFOOD_WORDS =
  /\b(fish|salmon|tuna|cod|sardines?|anchov(y|ies)|mackerel|trout|bass|bream|herring|haddock|hake|shrimps?|prawns?|squid|octopus|mussels?|oysters?|clams?|crabs?|lobsters?|calamari|cuttlefish|scallops?|taramas?|taramosalata|caviar|roe)\b/i;
const SEAFOOD_EXCEPT = /oyster mushroom|crab apple|fish-free/i;
const DAIRY_WORDS = /\b(cheese|yoghurt|yogurt|butter|buttermilk|milk|cream|kefir|feta|halloumi|ghee)\b/i;

function isUnique(values: string[]): boolean {
  return new Set(values).size === values.length;
}

describe('ingredient data quality', () => {
  it('has the intended group sizes and total', () => {
    for (const group of GROUPS) {
      expect(group.items.length, group.name).toBeGreaterThanOrEqual(group.min);
      expect(group.items.length, group.name).toBeLessThanOrEqual(group.max);
    }
    expect(INGREDIENTS.length).toBeGreaterThanOrEqual(270);
    expect(INGREDIENTS.length).toBeLessThanOrEqual(330);
    expect(INGREDIENTS.length).toBe(GROUPS.reduce((sum, group) => sum + group.items.length, 0));
  });

  it('has kebab-case ids that are unique across all files', () => {
    const ids = INGREDIENTS.map((ingredient) => ingredient.id);
    expect(ids.filter((id) => !KEBAB.test(id))).toEqual([]);
    expect(isUnique(ids)).toBe(true);
  });

  describe.each(GROUPS.flatMap((group) => group.items as Ingredient[]))('$id', (ingredient) => {
    const english = ingredient.names?.en ?? '';

    it('has exactly the contract fields', () => {
      expect(Object.keys(ingredient).sort()).toEqual(
        ['allergens', 'id', 'names', 'origin', 'per100g', 'units'],
      );
      expect(Object.keys(ingredient.names).sort()).toEqual(['el', 'en']);
      expect(Object.keys(ingredient.per100g).sort()).toEqual(['carbsG', 'fatG', 'kcal', 'proteinG']);
    });

    it('has a valid origin and allergen list', () => {
      expect(ORIGINS.has(ingredient.origin)).toBe(true);
      expect(ingredient.allergens.every((allergen) => ALLERGENS.has(allergen))).toBe(true);
      expect(isUnique(ingredient.allergens)).toBe(true);
    });

    it('has distinct, non-empty English and Greek names, the Greek in Greek letters', () => {
      expect(ingredient.names.en.trim()).not.toBe('');
      expect(ingredient.names.el.trim()).not.toBe('');
      expect(ingredient.names.en).not.toBe(ingredient.names.el);
      expect(GREEK.test(ingredient.names.el)).toBe(true);
    });

    it('has sane nutrients whose energy matches the macros', () => {
      const { kcal, proteinG, carbsG, fatG } = ingredient.per100g;
      for (const value of [kcal, proteinG, carbsG, fatG]) {
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
      }
      expect(kcal).toBeLessThanOrEqual(900);
      expect(proteinG + carbsG + fatG).toBeLessThanOrEqual(100.5);
      if (kcal >= KCAL_CHECK_FROM) {
        const fromMacros = 4 * proteinG + 4 * carbsG + 9 * fatG;
        const tolerance = kcal < LOW_ENERGY_KCAL ? LOW_ENERGY_KCAL_TOLERANCE : KCAL_TOLERANCE;
        expect(Math.abs(kcal - fromMacros) / fromMacros).toBeLessThanOrEqual(tolerance);
      }
    });

    it('has one to three household units with both plural forms in both languages', () => {
      expect(ingredient.units.length).toBeGreaterThanOrEqual(1);
      expect(ingredient.units.length).toBeLessThanOrEqual(3);
      for (const unit of ingredient.units) {
        expect(Object.keys(unit).sort()).toEqual(['grams', 'names']);
        expect(unit.grams).toBeGreaterThan(0);
        expect(unit.grams).toBeLessThanOrEqual(2000);
        for (const locale of ['en', 'el'] as const) {
          expect(unit.names[locale].one.trim()).not.toBe('');
          expect(unit.names[locale].other.trim()).not.toBe('');
        }
        expect(GREEK.test(unit.names.el.one)).toBe(true);
        expect(GREEK.test(unit.names.el.other)).toBe(true);
      }
    });

    it('carries the allergen tags its name calls for', () => {
      for (const rule of ALLERGEN_RULES) {
        if (rule.match.test(english) && !(rule.except?.test(english) ?? false)) {
          expect(ingredient.allergens, `${rule.label} in "${english}"`).toContain(rule.allergen);
        }
      }
    });

    it('has an origin that matches its name', () => {
      if (MEAT_WORDS.test(english) && !MEAT_EXCEPT.test(english)) {
        expect(ingredient.origin, `meat word in "${english}"`).toBe(Origin.Meat);
      }
      if (
        SEAFOOD_WORDS.test(english) &&
        !SEAFOOD_EXCEPT.test(english) &&
        !MEAT_WORDS.test(english)
      ) {
        expect(ingredient.origin, `seafood word in "${english}"`).toBe(Origin.Seafood);
      }
      if (DAIRY_WORDS.test(english) && !PLANT_MILK_QUALIFIER.test(english)) {
        expect(ingredient.origin, `dairy word in "${english}"`).toBe(Origin.Dairy);
      }
      if (/\beggs?\b/i.test(english) && !/egg-free/i.test(english)) {
        expect(ingredient.origin, `egg in "${english}"`).not.toBe(Origin.Plant);
      }
      if (/\bhoney$/i.test(english)) {
        expect(ingredient.origin).toBe(Origin.Honey);
      }
    });

    it('never tags a plant origin with an animal allergen', () => {
      if (ingredient.origin === Origin.Plant) {
        for (const allergen of [Allergen.Milk, Allergen.Eggs, Allergen.Fish, Allergen.Crustaceans, Allergen.Molluscs]) {
          expect(ingredient.allergens).not.toContain(allergen);
        }
      }
    });

    it('does not name a supplement', () => {
      expect(SUPPLEMENT_WORDS.test(ingredient.names.en)).toBe(false);
      expect(SUPPLEMENT_WORDS.test(ingredient.id.replaceAll('-', ' '))).toBe(false);
    });
  });
});
