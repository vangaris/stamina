import { describe, expect, it } from 'vitest';
import { toCountKey } from './to-count-key.ts';

describe('toCountKey', () => {
  it('words done of planned while done is within planned', () => {
    expect(toCountKey('progress.sessions', 0, 3)).toBe('progress.sessions.value');
    expect(toCountKey('progress.sessions', 3, 3)).toBe('progress.sessions.value');
  });

  it('words only what is done when nothing was planned', () => {
    expect(toCountKey('progress.activities', 0, 0)).toBe('progress.activities.valueUnplanned');
    expect(toCountKey('progress.activities', 2, 0)).toBe('progress.activities.valueUnplanned');
  });

  it('does not read "3 of 2" when more was done than planned', () => {
    expect(toCountKey('progress.activities', 3, 2)).toBe('progress.activities.valueOver');
  });
});
