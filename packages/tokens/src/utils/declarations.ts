import type { Token } from '../types.ts';
import { cssName } from './css-name.ts';
import { formatValue } from './format-value.ts';

/** One `--st-*: value;` line per token, each prefixed with `indent`. */
export const declarations = (tokens: Token[], indent: string) =>
  tokens.map((t) => `${indent}${cssName(t.path)}: ${formatValue(t)};`).join('\n');
