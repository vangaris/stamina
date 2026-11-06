import { describe, expect, it } from 'vitest';
import { summariseWeeklyLoad } from './summarise-weekly-load.ts';

const ANCHOR = '2026-11-06';
// Weeks: 10-09, 10-16, 10-23, 10-30 | current 11-06 (10-09 is 4 weeks before it)
const TODAY = '2026-11-08';
const summarise = (entries: { date: string; load: number }[]) =>
  summariseWeeklyLoad({ anchor: ANCHOR, today: TODAY, entries });

describe('summariseWeeklyLoad', () => {
  it('sums the entries of the current week', () => {
    const { current } = summarise([
      { date: '2026-11-06', load: 300 },
      { date: '2026-11-12', load: 200 },
      { date: '2026-11-13', load: 999 },
      { date: '2026-11-05', load: 999 },
    ]);
    expect(current).toEqual({ startsOn: '2026-11-06', load: 500 });
  });

  it('averages the four weeks before the current one, rounded', () => {
    const { previous, average } = summarise([
      { date: '2026-10-09', load: 100 },
      { date: '2026-10-16', load: 200 },
      { date: '2026-10-23', load: 300 },
      { date: '2026-10-30', load: 401 },
    ]);
    expect(previous.map((week) => week.load)).toEqual([100, 200, 300, 401]);
    expect(average).toBe(250);
  });

  it('counts a rest week after the first data as zero', () => {
    const { average } = summarise([
      { date: '2026-10-09', load: 400 },
      { date: '2026-10-30', load: 200 },
    ]);
    expect(average).toBe(150);
  });

  it('leaves out the weeks before the first entry, so a new user is not averaged against zeros', () => {
    const { previous, average } = summarise([{ date: '2026-10-28', load: 600 }]);
    expect(previous).toEqual([
      { startsOn: '2026-10-23', load: 600 },
      { startsOn: '2026-10-30', load: 0 },
    ]);
    expect(average).toBe(300);
  });

  it('has no average while there is no earlier week with data', () => {
    expect(summarise([]).average).toBeNull();
    expect(summarise([{ date: '2026-11-07', load: 400 }]).average).toBeNull();
    expect(summarise([{ date: '2026-11-07', load: 400 }]).previous).toEqual([]);
  });

  it('does not count weeks older than four weeks, and ignores later weeks', () => {
    const { previous, average } = summarise([
      { date: '2026-10-02', load: 9000 },
      { date: '2026-10-09', load: 100 },
      { date: '2026-11-13', load: 5000 },
    ]);
    expect(previous.map((week) => week.startsOn)).toEqual([
      '2026-10-09',
      '2026-10-16',
      '2026-10-23',
      '2026-10-30',
    ]);
    expect(average).toBe(25);
  });
});
