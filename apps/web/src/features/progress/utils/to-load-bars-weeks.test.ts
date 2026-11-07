import { Locale } from '@stamina/i18n';
import { describe, expect, it } from 'vitest';
import { toLoadBarsWeeks } from './to-load-bars-weeks.ts';

describe('toLoadBarsWeeks', () => {
  const weeks = [
    { startsOn: '2026-10-17', done: 400, planned: 0 },
    { startsOn: '2026-10-24', done: 520, planned: 0 },
    { startsOn: '2026-10-31', done: 300, planned: 150 },
  ];

  it('labels each week by its first day and keeps the order and the numbers', () => {
    expect(toLoadBarsWeeks(weeks, Locale.En)).toEqual([
      { label: 'Oct 17', done: 400, planned: 0, current: false },
      { label: 'Oct 24', done: 520, planned: 0, current: false },
      { label: 'Oct 31', done: 300, planned: 150, current: true },
    ]);
  });

  it('marks a lone week as the current one', () => {
    expect(toLoadBarsWeeks(weeks.slice(2), Locale.En)).toMatchObject([{ current: true }]);
  });

  it('labels weeks in Greek', () => {
    expect(toLoadBarsWeeks(weeks.slice(0, 1), Locale.El)[0]?.label).toMatch(/^17 Οκτ/);
  });

  it('draws nothing for no weeks', () => {
    expect(toLoadBarsWeeks([], Locale.En)).toEqual([]);
  });
});
