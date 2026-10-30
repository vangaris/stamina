import type { MessageTree } from '../types.ts';
import { argumentNames } from './argument-names.ts';
import { flattenMessages } from './flatten-messages.ts';

/**
 * What is wrong with a translation, relative to the English source. Empty when it is complete.
 * English is the source of truth: every key it has needs a Greek value that parses as ICU and
 * takes the same arguments.
 */
export function findTranslationProblems(source: MessageTree, translation: MessageTree): string[] {
  const en = flattenMessages(source);
  const tr = flattenMessages(translation);
  const problems: string[] = [];
  for (const [key, message] of Object.entries(en)) {
    const translated = tr[key];
    if (translated === undefined || translated.trim() === '') {
      problems.push(`missing: ${key}`);
      continue;
    }
    try {
      const expected = argumentNames(message).join(',');
      const actual = argumentNames(translated).join(',');
      if (expected !== actual) {
        problems.push(`arguments differ: ${key} (en {${expected}} vs {${actual}})`);
      }
    } catch (error) {
      problems.push(`invalid ICU: ${key} (${(error as Error).message})`);
    }
  }
  for (const key of Object.keys(tr)) {
    if (!(key in en)) problems.push(`not in English: ${key}`);
  }
  return problems;
}
