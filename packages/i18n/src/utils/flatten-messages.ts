import type { MessageTree } from '../types.ts';

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
