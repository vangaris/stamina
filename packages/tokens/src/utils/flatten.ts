import type { Token, TokenTree } from '../types.ts';

function isToken(node: unknown): node is { $value: unknown; $type?: string } {
  return typeof node === 'object' && node !== null && '$value' in node;
}

/** Flattens a DTCG tree to tokens in document order; `$type` is inherited from the nearest group. */
export function flatten(tree: TokenTree, path: string[] = [], type?: string): Token[] {
  const groupType = typeof tree.$type === 'string' ? tree.$type : type;
  const tokens: Token[] = [];
  for (const [key, node] of Object.entries(tree)) {
    if (key.startsWith('$') || typeof node !== 'object' || node === null) continue;
    if (isToken(node)) {
      const own = typeof node.$type === 'string' ? node.$type : groupType;
      tokens.push({ path: [...path, key], type: own, value: node.$value });
    } else {
      tokens.push(...flatten(node as TokenTree, [...path, key], groupType));
    }
  }
  return tokens;
}
