import { describe, expect, it } from 'vitest';
import { toWeekRowLabel } from './to-week-row-label.ts';

describe('toWeekRowLabel', () => {
  it('leaves a past week as its label', () => {
    expect(toWeekRowLabel({ label: 'Oct 12', done: 1, planned: 0 }, 'this week')).toBe('Oct 12');
  });

  it('marks the current week', () => {
    expect(toWeekRowLabel({ label: 'Nov 2', done: 1, planned: 0, current: true }, 'this week')).toBe(
      'Nov 2 (this week)',
    );
  });
});
