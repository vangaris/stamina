import { describe, expect, it } from 'vitest';
import { normalizeValue } from './normalize-value.ts';

describe('normalizeValue', () => {
  it('removes float drift of a sum', () => {
    expect(normalizeValue(0.1 + 0.2, { current: 0.1, step: 0.1 })).toBe(0.3);
    expect(normalizeValue(0.7 + 0.1, { current: 0.7, step: 0.1 })).toBe(0.8);
  });

  it('keeps the precision of the current value, step, min and max', () => {
    expect(normalizeValue(1.25, { current: 1.5, step: 1 })).toBe(1.3);
    expect(normalizeValue(1.25, { current: 1, step: 0.25 })).toBe(1.25);
    expect(normalizeValue(1.26, { current: 1, step: 1, min: 0.125 })).toBe(1.26);
    expect(normalizeValue(0.26, { current: 0, step: 1, max: 5.5 })).toBe(0.3);
  });

  it('does not round integers away from a whole step', () => {
    expect(normalizeValue(61, { current: 60, step: 1 })).toBe(61);
  });

  it('clamps to the bounds after rounding', () => {
    expect(normalizeValue(105, { current: 100, step: 5, max: 100 })).toBe(100);
    expect(normalizeValue(-2, { current: 0, step: 2, min: 0 })).toBe(0);
  });

  it('is unbounded without min and max', () => {
    expect(normalizeValue(-1000.5, { current: 0, step: 0.5 })).toBe(-1000.5);
  });

  it('survives tiny exponent-form precision', () => {
    expect(normalizeValue(2e-7, { current: 1e-7, step: 1e-7 })).toBe(2e-7);
  });
});
