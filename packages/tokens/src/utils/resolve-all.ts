import { ALIAS } from '../config.ts';
import type { Token, TokenTree } from '../types.ts';
import { flatten } from './flatten.ts';

function lookup(primitives: Map<string, Token>, ref: string, seen: string[] = []): Token {
  if (seen.includes(ref)) throw new Error(`Token alias cycle: ${[...seen, ref].join(' -> ')}`);
  const token = primitives.get(ref);
  if (!token) throw new Error(`Token alias {${ref}} does not exist in the primitive tier`);
  const next = typeof token.value === 'string' ? ALIAS.exec(token.value) : null;
  return next?.[1] ? lookup(primitives, next[1], [...seen, ref]) : token;
}

/** Resolves a semantic token's aliases against the primitive tier (keyed by dotted path). */
export function resolveAll(tree: TokenTree, primitives: Map<string, Token>): Token[] {
  return flatten(tree).map((token) => {
    const ref = typeof token.value === 'string' ? ALIAS.exec(token.value) : null;
    if (!ref?.[1]) throw new Error(`${token.path.join('.')} must alias a primitive token`);
    const target = lookup(primitives, ref[1]);
    return { ...token, value: target.value };
  });
}
