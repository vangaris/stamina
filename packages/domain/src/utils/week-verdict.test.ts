import { describe, expect, it } from 'vitest';
import { VerdictKind } from '../enums/verdict-kind.ts';
import type { WeekVerdictInput } from '../types.ts';
import { weekVerdict } from './week-verdict.ts';

const verdict = (overrides: Partial<WeekVerdictInput>) =>
  weekVerdict({
    done: 300,
    planned: 200,
    average: 500,
    sessionsMissed: 0,
    ...overrides,
  });

describe('weekVerdict', () => {
  it('has nothing to compare with before an earlier week has data', () => {
    expect(verdict({ average: null })).toBe(VerdictKind.NotEnoughHistory);
  });

  it('is on track when done plus planned lands within 10 percent of the average', () => {
    expect(verdict({ done: 300, planned: 200 })).toBe(VerdictKind.OnTrack);
    expect(verdict({ done: 450, planned: 0 })).toBe(VerdictKind.OnTrack);
    expect(verdict({ done: 550, planned: 0 })).toBe(VerdictKind.OnTrack);
  });

  it('is above the usual past 110 percent of the average', () => {
    expect(verdict({ done: 551, planned: 0 })).toBe(VerdictKind.AboveUsual);
    expect(verdict({ done: 400, planned: 300 })).toBe(VerdictKind.AboveUsual);
  });

  it('is below the usual under 90 percent of the average', () => {
    expect(verdict({ done: 449, planned: 0 })).toBe(VerdictKind.BelowUsual);
    expect(verdict({ done: 0, planned: 0 })).toBe(VerdictKind.BelowUsual);
  });

  it('counts the planned Load, so an early week is not below the usual', () => {
    expect(verdict({ done: 100, planned: 400 })).toBe(VerdictKind.OnTrack);
  });

  it('puts a missed Session ahead of the Load comparison', () => {
    expect(verdict({ sessionsMissed: 1 })).toBe(VerdictKind.SessionsBehind);
    expect(verdict({ sessionsMissed: 2, average: null })).toBe(VerdictKind.SessionsBehind);
  });

  it('is not behind while no Session is missed', () => {
    expect(verdict({ sessionsMissed: 0 })).toBe(VerdictKind.OnTrack);
  });

  it('compares against a zero average without dividing by it', () => {
    expect(verdict({ average: 0, done: 0, planned: 0 })).toBe(VerdictKind.OnTrack);
    expect(verdict({ average: 0, done: 10, planned: 0 })).toBe(VerdictKind.AboveUsual);
  });
});
