import { describe, expect, it } from 'vitest';
import { sessionLoad } from './session-load.ts';

describe('sessionLoad', () => {
  it('multiplies the session RPE by the minutes', () => {
    expect(sessionLoad(7, 45)).toBe(315);
    expect(sessionLoad(1, 1)).toBe(1);
  });
});
