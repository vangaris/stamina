import {
  DECIMAL_SEPARATORS,
  GRAMS_UNIT,
  NAME_QUALIFIER_SEPARATOR,
  PORTION_UNIT_STEP,
} from '../config.ts';
import type { Ingredient, NameLocale, PortionDescription } from '../types.ts';
import { stemWords } from './stem-text.ts';

function formatNumber(value: number, locale: NameLocale): string {
  return String(value).replace('.', DECIMAL_SEPARATORS[locale]);
}

/**
 * Whether the unit's label already names the food ("eggs", "medium tomato", "tortilla"): it shares
 * a word, plural or singular, with the ingredient's name before its first comma.
 */
function namesTheFood(label: string, ingredientName: string): boolean {
  const [main = ''] = ingredientName.split(NAME_QUALIFIER_SEPARATOR);
  const food = new Set(stemWords(main));
  return stemWords(label).some((word) => food.has(word));
}

/**
 * Household wording for an amount: "2 tablespoons (20 g)", plus `line`, the same amount as one line
 * that says what the food is: "2 tablespoons olive oil (20 g)", "2.5 eggs (120 g)" (the unit names
 * the food already) or "20 g olive oil" (too small for a household measure). Uses the ingredient's
 * default unit, rounded to the nearest half unit (at least half); an amount smaller than half a
 * unit stays in grams.
 */
export function describePortion(
  ingredient: Ingredient,
  grams: number,
  locale: NameLocale,
): PortionDescription {
  const exact = Math.round(grams);
  const exactText = formatNumber(exact, locale);
  const name = ingredient.names[locale].toLocaleLowerCase(locale);
  const unit = ingredient.units[0];
  if (!unit || grams < unit.grams * PORTION_UNIT_STEP) {
    const text = `${exactText} ${GRAMS_UNIT}`;
    return { text, line: `${text} ${name}`, units: exact, unit: GRAMS_UNIT };
  }
  const units = Math.round(grams / unit.grams / PORTION_UNIT_STEP) * PORTION_UNIT_STEP;
  const unitNames = unit.names[locale];
  const label = units === 1 ? unitNames.one : unitNames.other;
  const amount = `${formatNumber(units, locale)} ${label}`;
  const text = `${amount} (${exactText} ${GRAMS_UNIT})`;
  const food = namesTheFood(`${unitNames.one} ${unitNames.other}`, ingredient.names[locale]);
  return {
    text,
    line: food ? text : `${amount} ${name} (${exactText} ${GRAMS_UNIT})`,
    units,
    unit: label,
  };
}
