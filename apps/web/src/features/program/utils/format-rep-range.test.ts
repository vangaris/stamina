import { describe, expect, it } from 'vitest';
import { formatRepRange } from './format-rep-range.ts';

describe('formatRepRange', () => {
  it('shows one number when the range is a single value', () => {
    expect(formatRepRange({ repMin: 10, repMax: 10 })).toBe('10');
  });

  it('shows the two ends of a range', () => {
    expect(formatRepRange({ repMin: 4, repMax: 6 })).toBe('4-6');
  });
});
