import { describe, expect, it } from 'vitest';
import { clampToRange } from './clamp-to-range.ts';

describe('clampToRange', () => {
  it('keeps values inside the range, including the bounds', () => {
    expect(clampToRange(5, 0, 10)).toBe(5);
    expect(clampToRange(0, 0, 10)).toBe(0);
    expect(clampToRange(10, 0, 10)).toBe(10);
  });

  it('pulls values outside the range to the nearest bound', () => {
    expect(clampToRange(-1, 0, 10)).toBe(0);
    expect(clampToRange(11, 0, 10)).toBe(10);
  });

  it('leaves an omitted bound open', () => {
    expect(clampToRange(-100, undefined, 10)).toBe(-100);
    expect(clampToRange(100, 0)).toBe(100);
    expect(clampToRange(-3)).toBe(-3);
    expect(clampToRange(50, undefined, 10)).toBe(10);
    expect(clampToRange(-50, 0)).toBe(0);
  });
});
