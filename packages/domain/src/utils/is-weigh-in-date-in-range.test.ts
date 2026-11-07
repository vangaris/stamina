import { describe, expect, it } from 'vitest';
import { MAX_ACTIVITY_FUTURE_DAYS, MAX_WEIGH_IN_PAST_DAYS } from '../config.ts';
import { addDays } from './add-days.ts';
import { isWeighInDateInRange } from './is-weigh-in-date-in-range.ts';

const TODAY = '2026-11-08';

describe('isWeighInDateInRange', () => {
  it('accepts today, the day ahead the clock may be off by, and the oldest day allowed', () => {
    expect(isWeighInDateInRange(TODAY, TODAY)).toBe(true);
    expect(isWeighInDateInRange(TODAY, addDays(TODAY, MAX_ACTIVITY_FUTURE_DAYS))).toBe(true);
    expect(isWeighInDateInRange(TODAY, addDays(TODAY, -MAX_WEIGH_IN_PAST_DAYS))).toBe(true);
  });

  it('rejects a day past either bound, including years the database cannot store', () => {
    expect(isWeighInDateInRange(TODAY, addDays(TODAY, MAX_ACTIVITY_FUTURE_DAYS + 1))).toBe(false);
    expect(isWeighInDateInRange(TODAY, addDays(TODAY, -MAX_WEIGH_IN_PAST_DAYS - 1))).toBe(false);
    expect(isWeighInDateInRange(TODAY, '0000-01-01')).toBe(false);
  });
});
