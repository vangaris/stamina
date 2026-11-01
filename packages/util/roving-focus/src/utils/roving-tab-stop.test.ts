import { describe, expect, it } from 'vitest';
import { rovingTabStop } from './roving-tab-stop.ts';

// Items: 0 enabled, 1 disabled, 2 enabled, 3 enabled, 4 disabled
const disabled = [false, true, false, false, true];

describe('rovingTabStop', () => {
  it('is the selected item when it is enabled, else the first enabled one', () => {
    expect(rovingTabStop(disabled, 3)).toBe(3);
    expect(rovingTabStop(disabled, 1)).toBe(0);
    expect(rovingTabStop(disabled, -1)).toBe(0);
    expect(rovingTabStop([true, false], -1)).toBe(1);
  });

  it('is undefined when nothing can be focused', () => {
    expect(rovingTabStop([true, true], 0)).toBeUndefined();
  });
});
