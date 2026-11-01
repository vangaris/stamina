import { describe, expect, it } from 'vitest';
import { Key } from '@stamina/a11y';
import { RovingKeys } from '../enums/roving-keys.ts';
import { rovingTarget } from './roving-target.ts';

// Items: 0 enabled, 1 disabled, 2 enabled, 3 enabled, 4 disabled
const disabled = [false, true, false, false, true];

describe('rovingTarget', () => {
  it('moves to the next enabled item, skipping disabled ones, and wraps', () => {
    expect(rovingTarget(disabled, 0, Key.ArrowRight)).toBe(2);
    expect(rovingTarget(disabled, 3, Key.ArrowRight)).toBe(0);
    expect(rovingTarget(disabled, 2, Key.ArrowLeft)).toBe(0);
    expect(rovingTarget(disabled, 0, Key.ArrowLeft)).toBe(3);
  });

  it('jumps to the first and last enabled item', () => {
    expect(rovingTarget(disabled, 2, Key.Home)).toBe(0);
    expect(rovingTarget(disabled, 2, Key.End)).toBe(3);
  });

  it('uses Up/Down only for groups that ask for both axes', () => {
    expect(rovingTarget(disabled, 0, Key.ArrowDown)).toBeUndefined();
    expect(rovingTarget(disabled, 0, Key.ArrowDown, RovingKeys.Both)).toBe(2);
    expect(rovingTarget(disabled, 0, Key.ArrowUp, RovingKeys.Both)).toBe(3);
  });

  it('starts from the ends when the current item is not an enabled one', () => {
    expect(rovingTarget(disabled, -1, Key.ArrowRight)).toBe(0);
    expect(rovingTarget(disabled, 1, Key.ArrowLeft)).toBe(3);
  });

  it('ignores other keys and has nowhere to go when everything is disabled', () => {
    expect(rovingTarget(disabled, 0, 'a')).toBeUndefined();
    expect(rovingTarget([true, true], 0, Key.ArrowRight)).toBeUndefined();
    expect(rovingTarget([], 0, Key.Home)).toBeUndefined();
  });
});
