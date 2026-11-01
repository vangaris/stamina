import { describe, expect, it } from 'vitest';
import { parseBirthYear } from './parse-birth-year.ts';

const NOW = 2026;

describe('parseBirthYear', () => {
  it('reads a four-digit year, ignoring surrounding spaces', () => {
    expect(parseBirthYear('1990', NOW)).toBe(1990);
    expect(parseBirthYear(' 2008 ', NOW)).toBe(2008);
  });

  it('accepts the first allowed year and this year', () => {
    expect(parseBirthYear('1900', NOW)).toBe(1900);
    expect(parseBirthYear('2026', NOW)).toBe(2026);
  });

  it.each([['1899'], ['2027'], ['199'], ['19900'], ['abcd'], ['19 9'], ['-199'], ['1e99'], ['']])(
    'rejects %j',
    (text) => {
      expect(parseBirthYear(text, NOW)).toBeUndefined();
    },
  );
});
