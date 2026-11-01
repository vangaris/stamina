import type { Token } from '../types.ts';

/** CSS text for a resolved token value; array values (font stacks) quote entries with whitespace. */
export function formatValue(token: Token): string {
  const { value, type } = token;
  if (Array.isArray(value)) {
    return value.map((v) => (/\s/.test(String(v)) ? `"${String(v)}"` : String(v))).join(', ');
  }
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  throw new Error(`Unsupported value for ${token.path.join('.')} (${type ?? 'untyped'})`);
}
