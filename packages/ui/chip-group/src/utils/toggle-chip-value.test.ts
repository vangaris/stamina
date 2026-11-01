import { describe, expect, it } from 'vitest';
import { toggleChipValue } from './toggle-chip-value.ts';

const single = { multiple: false, allowDeselect: false };
const singleDeselect = { multiple: false, allowDeselect: true };
const multiple = { multiple: true, allowDeselect: false };

describe('toggleChipValue', () => {
  it('single: selects a chip, replacing the previous one', () => {
    expect(toggleChipValue(null, 'a', single)).toBe('a');
    expect(toggleChipValue('a', 'b', single)).toBe('b');
  });

  it('single: keeps the selection when the selected chip is clicked again', () => {
    expect(toggleChipValue('a', 'a', single)).toBe('a');
  });

  it('single: clears the selection on the selected chip only with allowDeselect', () => {
    expect(toggleChipValue('a', 'a', singleDeselect)).toBeNull();
    expect(toggleChipValue('a', 'b', singleDeselect)).toBe('b');
  });

  it('single: treats 0 as a real value, not as empty', () => {
    expect(toggleChipValue(null, 0, single)).toBe(0);
    expect(toggleChipValue(0, 0, singleDeselect)).toBeNull();
  });

  it('multiple: adds a value, keeping order and without mutating the model', () => {
    const model = ['a'];
    expect(toggleChipValue(model, 'b', multiple)).toEqual(['a', 'b']);
    expect(model).toEqual(['a']);
  });

  it('multiple: removes a value that is already on', () => {
    expect(toggleChipValue(['a', 'b', 'c'], 'b', multiple)).toEqual(['a', 'c']);
    expect(toggleChipValue(['a'], 'a', multiple)).toEqual([]);
  });

  it('multiple: starts from an empty list when the model is not an array', () => {
    expect(toggleChipValue(null, 'a', multiple)).toEqual(['a']);
  });

  it('multiple: ignores allowDeselect', () => {
    expect(toggleChipValue(['a'], 'b', { multiple: true, allowDeselect: true })).toEqual([
      'a',
      'b',
    ]);
  });

  it('does not confuse 1 with "1"', () => {
    expect(toggleChipValue([1], '1', multiple)).toEqual([1, '1']);
  });
});
