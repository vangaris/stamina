import type { Ingredient, MealTemplate } from '../types.ts';
import { foldText } from './fold-text.ts';
import { stemWords } from './stem-text.ts';
import { templateIngredients } from './template-ingredients.ts';

type Language = 'en' | 'el';

const LANGUAGES: readonly Language[] = ['en', 'el'];

/**
 * Whether the stems of `needle` are the head of an ingredient name: they end the first comma
 * segment in English ("olives" in "Black olives", not in "Olive oil"), and start it in Greek
 * ("αυγά" in "Αυγό, ωμό").
 */
function isHead(name: string, language: Language, needle: readonly string[]): boolean {
  const words = stemWords(name.split(',')[0] ?? '');
  if (needle.length === 0 || needle.length > words.length) return false;
  const start = language === 'en' ? words.length - needle.length : 0;
  return needle.every((stem, offset) => words[start + offset] === stem);
}

/**
 * Whether a free-text dislike names the ingredient, or any ingredient or the name of the template.
 * Case and accents are ignored; the dislike may be a part of the name, or the plural of an
 * ingredient's head noun ("eggs", "αυγά" name an egg; "olives" do not name olive oil). A blank
 * dislike matches nothing.
 */
export function matchesDislike(dislike: string, subject: Ingredient | MealTemplate): boolean {
  const needle = foldText(dislike);
  if (!needle) return false;
  const needleStems = stemWords(dislike);
  const ingredients = 'ingredients' in subject ? templateIngredients(subject) : [subject];
  const names = [subject, ...ingredients].flatMap((named) =>
    LANGUAGES.map((language) => named.names[language]),
  );
  return (
    names.some((name) => foldText(name).includes(needle)) ||
    ingredients.some((ingredient) =>
      LANGUAGES.some((language) => isHead(ingredient.names[language], language, needleStems)),
    )
  );
}
