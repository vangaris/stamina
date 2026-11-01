import type { Json } from '../types.ts';

/** Copies only the listed keys that are present (not `undefined`); everything else is dropped. */
export function pick(source: Json, keys: readonly string[]): Json {
  const out: Json = {};
  for (const key of keys) if (source[key] !== undefined) out[key] = source[key];
  return out;
}
