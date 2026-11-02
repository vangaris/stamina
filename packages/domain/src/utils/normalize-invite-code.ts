import {
  INVITE_CODE_ALPHABET,
  INVITE_CODE_INPUT_MAX_LENGTH,
  INVITE_CODE_LENGTH,
} from '../config.ts';

/**
 * Canonical form of what someone typed or pasted: upper case, no spaces or hyphens. Returns
 * `undefined` when the input is over-long (checked before it is scanned) or the result cannot be a code, so callers never query with garbage.
 */
export function normalizeInviteCode(input: string): string | undefined {
  if (input.length > INVITE_CODE_INPUT_MAX_LENGTH) return undefined;
  const code = input.replace(/[\s-]/g, '').toUpperCase();
  if (code.length !== INVITE_CODE_LENGTH) return undefined;
  return [...code].every((char) => INVITE_CODE_ALPHABET.includes(char)) ? code : undefined;
}
