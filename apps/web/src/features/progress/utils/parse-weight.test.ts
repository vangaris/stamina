import { describe, expect, it } from 'vitest';
import { parseWeight } from './parse-weight.ts';

describe('parseWeight', () => {
  it('reads a whole or decimal weight', () => {
    expect(parseWeight('72')).toBe(72);
    expect(parseWeight('72.5')).toBe(72.5);
  });

  it('reads a comma as the decimal point', () => {
    expect(parseWeight('72,5')).toBe(72.5);
  });

  it('ignores spaces around it', () => {
    expect(parseWeight('  80 ')).toBe(80);
  });

  it('accepts the lowest and highest weights', () => {
    expect(parseWeight('30')).toBe(30);
    expect(parseWeight('300')).toBe(300);
  });

  it('refuses a weight outside 30 to 300 kg', () => {
    expect(parseWeight('29.9')).toBeUndefined();
    expect(parseWeight('300.5')).toBeUndefined();
    expect(parseWeight('0')).toBeUndefined();
  });

  it('refuses text that is not a plain number', () => {
    for (const text of ['', ' ', 'abc', '72kg', '-70', '1e2', '72.', '.5', '72.555', '7 2']) {
      expect(parseWeight(text)).toBeUndefined();
    }
  });
});
