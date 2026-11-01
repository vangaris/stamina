import { CODE_LENGTH } from '../config.ts';

/** Keeps only the digits of a typed or pasted code ("123 456", "123-456") and caps the length. */
export function normalizeCode(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, CODE_LENGTH);
}
