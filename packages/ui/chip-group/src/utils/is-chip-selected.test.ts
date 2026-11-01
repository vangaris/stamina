import { describe, expect, it } from 'vitest';
import { isChipSelected } from './is-chip-selected.ts';

describe('isChipSelected', () => {
  it('single: compares by strict equality', () => {
    expect(isChipSelected('a', 'a')).toBe(true);
    expect(isChipSelected('a', 'b')).toBe(false);
    expect(isChipSelected(null, 'a')).toBe(false);
    expect(isChipSelected(1, '1')).toBe(false);
    expect(isChipSelected(0, 0)).toBe(true);
  });

  it('multiple: checks membership', () => {
    expect(isChipSelected(['a', 'b'], 'b')).toBe(true);
    expect(isChipSelected(['a'], 'b')).toBe(false);
    expect(isChipSelected([], 'a')).toBe(false);
  });
});
