import { describe, expect, it } from 'vitest';
import { formatLoadBarsNumber } from './format-load-bars-number.ts';

describe('formatLoadBarsNumber', () => {
  it('writes thousands the way the language does', () => {
    expect(formatLoadBarsNumber(1840, 'en')).toBe('1,840');
    expect(formatLoadBarsNumber(1840, 'el')).toBe('1.840');
  });

  it('rounds to a whole number', () => {
    expect(formatLoadBarsNumber(307.6, 'en')).toBe('308');
  });
});
