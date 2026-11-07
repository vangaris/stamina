import {
  ENGLISH_FINAL_E,
  ENGLISH_PLURAL_IES,
  ENGLISH_PLURAL_S,
  GREEK_FINAL_SIGMA,
  GREEK_LETTERS,
  GREEK_VOWELS,
  MIN_STEM_LENGTH,
  WORD_SEPARATOR,
} from '../config.ts';
import { foldText } from './fold-text.ts';

/**
 * A plural and its singular fold to the same stem, in English ("eggs", "egg") and in Greek
 * ("ντομάτες", "ντομάτα"). A light fold, not a stemmer: only used to compare two words.
 */
function stemWord(word: string): string {
  if (word.length < MIN_STEM_LENGTH) return word;
  if (GREEK_LETTERS.test(word)) {
    const stem = (word.endsWith(GREEK_FINAL_SIGMA) ? word.slice(0, -1) : word).replace(
      GREEK_VOWELS,
      '',
    );
    return stem.length >= MIN_STEM_LENGTH - 1 ? stem : word;
  }
  const singular = ENGLISH_PLURAL_IES.test(word)
    ? word.replace(ENGLISH_PLURAL_IES, 'y')
    : word.replace(ENGLISH_PLURAL_S, '');
  return singular.length >= MIN_STEM_LENGTH ? singular.replace(ENGLISH_FINAL_E, '') : singular;
}

/** The words of a text, folded for case, accents and final sigma, each reduced to its stem. */
export function stemWords(text: string): string[] {
  return foldText(text)
    .split(WORD_SEPARATOR)
    .filter((word) => word !== '')
    .map(stemWord);
}
