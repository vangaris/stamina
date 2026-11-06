import { Locale } from '@stamina/i18n';
import { describe, expect, it } from 'vitest';
import { createNumberFormat } from './create-number-format.ts';

describe('createNumberFormat', () => {
  it('writes a decimal point in English and a decimal comma in Greek', () => {
    expect(createNumberFormat(Locale.En)(42.5)).toBe('42.5');
    expect(createNumberFormat(Locale.El)(42.5)).toBe('42,5');
  });

  it('keeps one decimal at most and no trailing zero', () => {
    expect(createNumberFormat(Locale.En)(40)).toBe('40');
    expect(createNumberFormat(Locale.En)(37.04)).toBe('37');
  });
});
