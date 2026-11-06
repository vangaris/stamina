import { describe, expect, it } from 'vitest';
import { nextSetNumber } from './next-set-number.ts';

describe('nextSetNumber', () => {
  it('starts at 1', () => {
    expect(nextSetNumber([])).toBe(1);
  });

  it('is one more than the highest set number, wherever it sits', () => {
    expect(nextSetNumber([{ setNumber: 1 }, { setNumber: 2 }])).toBe(3);
    expect(nextSetNumber([{ setNumber: 3 }, { setNumber: 1 }])).toBe(4);
  });
});
