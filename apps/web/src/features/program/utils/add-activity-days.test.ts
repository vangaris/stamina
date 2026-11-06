import { describe, expect, it } from 'vitest';
import type { WeekDay } from '../types.ts';
import { addActivityDays } from './add-activity-days.ts';

const day = (date: string): WeekDay => ({ date, session: undefined, hardActivity: false });
const days = [day('2026-11-07'), day('2026-11-08')];

describe('addActivityDays', () => {
  it('adds a day for an Activity outside the shown days, in date order', () => {
    expect(addActivityDays(days, ['2026-11-06', '2026-11-10']).map(({ date }) => date)).toEqual([
      '2026-11-06',
      '2026-11-07',
      '2026-11-08',
      '2026-11-10',
    ]);
  });

  it('leaves the days alone when every Activity is on a shown day', () => {
    expect(addActivityDays(days, ['2026-11-08', '2026-11-08'])).toEqual(days);
  });

  it('adds a date once however many Activities it has', () => {
    expect(addActivityDays(days, ['2026-11-06', '2026-11-06'])).toHaveLength(3);
  });
});
