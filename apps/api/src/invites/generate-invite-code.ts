import { randomInt } from 'node:crypto';
import { INVITE_CODE_ALPHABET, INVITE_CODE_LENGTH } from '@stamina/domain';

/** A random code in canonical form: `INVITE_CODE_LENGTH` characters from `INVITE_CODE_ALPHABET`. */
export function generateInviteCode(): string {
  return Array.from(
    { length: INVITE_CODE_LENGTH },
    () => INVITE_CODE_ALPHABET[randomInt(INVITE_CODE_ALPHABET.length)]!,
  ).join('');
}
