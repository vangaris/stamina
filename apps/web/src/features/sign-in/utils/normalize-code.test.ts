import { describe, expect, it } from 'vitest';
import { normalizeCode } from './normalize-code.ts';

describe('normalizeCode', () => {
  it('keeps digits only, so a pasted "123 456" is a valid code', () => {
    expect(normalizeCode('123 456')).toBe('123456');
    expect(normalizeCode('12-34-56')).toBe('123456');
    expect(normalizeCode('ab12')).toBe('12');
  });

  it('caps the code at the code length', () => {
    expect(normalizeCode('1234567890')).toBe('123456');
  });
});
