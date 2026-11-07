import { describe, expect, it } from 'vitest';
import { plannedSessionLoad } from './planned-session-load.ts';

describe('plannedSessionLoad', () => {
  it('uses the effort of the week in the Block: RPE 7, 8, 9, then 6 in the Deload', () => {
    expect(plannedSessionLoad(1, 45)).toBe(7 * 45);
    expect(plannedSessionLoad(2, 45)).toBe(8 * 45);
    expect(plannedSessionLoad(3, 45)).toBe(9 * 45);
    expect(plannedSessionLoad(4, 45)).toBe(6 * 45);
  });
});
