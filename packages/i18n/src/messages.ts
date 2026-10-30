import { parse, TYPE, type MessageFormatElement } from '@formatjs/icu-messageformat-parser';

export type MessageTree = { [key: string]: string | MessageTree };

/** `{ a: { b: 'x' } }` becomes `{ 'a.b': 'x' }`. */
export function flattenMessages(tree: MessageTree, prefix = ''): Record<string, string> {
  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') flat[path] = value;
    else Object.assign(flat, flattenMessages(value, path));
  }
  return flat;
}

/** Names of the arguments an ICU message uses, including those inside plural/select branches. */
export function argumentNames(message: string): string[] {
  const names = new Set<string>();
  const visit = (elements: MessageFormatElement[]) => {
    for (const el of elements) {
      if (el.type === TYPE.literal || el.type === TYPE.pound) continue;
      names.add(el.value);
      if (el.type === TYPE.plural || el.type === TYPE.select) {
        for (const option of Object.values(el.options)) visit(option.value);
      } else if (el.type === TYPE.tag) {
        visit(el.children);
      }
    }
  };
  visit(parse(message));
  return [...names].sort();
}

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
