import { describe, expect, it } from 'vitest';
import { stepValue } from './step-value.ts';

describe('stepValue', () => {
  it('steps up and down by the step', () => {
    expect(stepValue(60, 1, { step: 1 })).toBe(61);
    expect(stepValue(60, -1, { step: 2.5 })).toBe(57.5);
    expect(stepValue(60, 1, { step: 2.5 })).toBe(62.5);
  });

  it('adds fractional steps without float drift', () => {
    expect(stepValue(0.1, 1, { step: 0.2 })).toBe(0.3);
    expect(stepValue(0.3, -1, { step: 0.1 })).toBe(0.2);
  });

  it('stops at the bounds', () => {
    expect(stepValue(9.5, 1, { step: 2.5, max: 10 })).toBe(10);
    expect(stepValue(10, 1, { step: 2.5, max: 10 })).toBe(10);
    expect(stepValue(1, -1, { step: 2.5, min: 0 })).toBe(0);
    expect(stepValue(0, -1, { step: 1, min: 0 })).toBe(0);
  });

  it('moves freely when unbounded', () => {
    expect(stepValue(0, -1, { step: 1 })).toBe(-1);
  });
});
