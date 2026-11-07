import { MAX_HEIGHT_CM, MIN_HEIGHT_CM } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { parseHeight } from './parse-height.ts';

describe('parseHeight', () => {
  it('reads whole centimetres, trimmed', () => {
    expect(parseHeight(' 178 ')).toBe(178);
  });

  it('accepts the lowest and highest height', () => {
    expect(parseHeight(String(MIN_HEIGHT_CM))).toBe(MIN_HEIGHT_CM);
    expect(parseHeight(String(MAX_HEIGHT_CM))).toBe(MAX_HEIGHT_CM);
  });

  it('refuses a height outside the range', () => {
    expect(parseHeight(String(MIN_HEIGHT_CM - 1))).toBeUndefined();
    expect(parseHeight(String(MAX_HEIGHT_CM + 1))).toBeUndefined();
  });

  it('refuses text that is not whole centimetres', () => {
    expect(parseHeight('')).toBeUndefined();
    expect(parseHeight('178.5')).toBeUndefined();
    expect(parseHeight('tall')).toBeUndefined();
  });
});
