import { describe, expect, it } from 'vitest';
import { INVITE_CODE_INPUT_MAX_LENGTH } from '../config.ts';
import { normalizeInviteCode } from './normalize-invite-code.ts';

describe('normalizeInviteCode', () => {
  it('upper-cases and strips spaces and hyphens', () => {
    expect(normalizeInviteCode(' abcde-fgh23 ')).toBe('ABCDEFGH23');
  });

  it('rejects a wrong length', () => {
    expect(normalizeInviteCode('ABCDEFGH2')).toBeUndefined();
    expect(normalizeInviteCode('ABCDEFGH234')).toBeUndefined();
  });

  it('rejects characters outside the alphabet, such as 0, O, 1, I and L', () => {
    for (const bad of ['ABCDEFGH20', 'ABCDEFGH2O', 'ABCDEFGH21', 'ABCDEFGH2I', 'ABCDEFGH2L']) {
      expect(normalizeInviteCode(bad)).toBeUndefined();
    }
  });

  it('rejects over-long input even when it normalises to a valid code', () => {
    const padded = `ABCDEFGH23${' '.repeat(INVITE_CODE_INPUT_MAX_LENGTH)}`;
    expect(normalizeInviteCode(padded)).toBeUndefined();
  });
});
