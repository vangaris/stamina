import { describe, expect, it } from 'vitest';
import { makeProgram, makeSession } from '../testing/make-program.ts';
import { buildWeekDays } from './build-week-days.ts';

describe('buildWeekDays', () => {
  it('lists seven days from the start date, with free days empty', () => {
    const program = makeProgram({
      sessions: [makeSession({ date: '2026-11-06' }), makeSession({ date: '2026-11-09' })],
    });

    const days = buildWeekDays(program);

    expect(days.map(({ date }) => date)).toEqual([
      '2026-11-06',
      '2026-11-07',
      '2026-11-08',
      '2026-11-09',
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
    ]);
    expect(days.map(({ session }) => session !== undefined)).toEqual([
      true,
      false,
      false,
      true,
      false,
      false,
      false,
    ]);
  });

  it('marks the days with a hard Activity, apart from Session days and free days', () => {
    const program = makeProgram({
      sessions: [makeSession({ date: '2026-11-06' })],
      hardActivityDates: ['2026-11-08'],
    });

    const days = buildWeekDays(program);

    expect(days.filter(({ hardActivity }) => hardActivity).map(({ date }) => date)).toEqual([
      '2026-11-08',
    ]);
  });
});
