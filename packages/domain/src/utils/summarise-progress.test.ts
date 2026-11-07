import { describe, expect, it } from 'vitest';
import { Intensity } from '../enums/intensity.ts';
import { VerdictKind } from '../enums/verdict-kind.ts';
import { Weekday } from '../enums/weekday.ts';
import type { PlannedActivityInput, ProgressActivity, ProgressSession } from '../types.ts';
import { summariseProgress } from './summarise-progress.ts';

// Weeks start on Friday 2026-11-06 (the anchor); today is the Sunday of that first week.
const ANCHOR = '2026-11-06';
const TODAY = '2026-11-08';
const PREVIOUS_WEEK = '2026-10-30';

/** Moderate play counts at RPE 6, so a 60-minute day is a Load of 360. */
const PADEL: PlannedActivityInput = {
  playDays: [Weekday.Fri, Weekday.Tue],
  playVaries: false,
  playMinutes: 60,
  playIntensity: Intensity.Moderate,
};
const PLAY_DAY_LOAD = 360;
/** A week-1 Session counts at RPE 7, so 45 minutes is a Load of 315. */
const SESSION_LOAD = 315;

const session = (date: string, finished = false): ProgressSession => ({
  date,
  weekInBlock: 1,
  minutes: 45,
  finished,
});
const THREE_SESSIONS = (finished: readonly string[] = []) =>
  ['2026-11-06', '2026-11-08', '2026-11-11'].map((date) => session(date, finished.includes(date)));

const progress = (
  overrides: Partial<{
    today: string;
    entries: { date: string; load: number }[];
    sessions: ProgressSession[];
    activities: ProgressActivity[];
    play: PlannedActivityInput | undefined;
  }> = {},
) =>
  summariseProgress({
    anchor: ANCHOR,
    today: TODAY,
    entries: [],
    sessions: THREE_SESSIONS(),
    activities: [],
    play: PADEL,
    ...overrides,
  });

describe('summariseProgress', () => {
  it('plans every Session and the play days still to come of a fresh week, and calls the Session due earlier behind', () => {
    const result = progress();

    expect(result.weekStartsOn).toBe(ANCHOR);
    expect(result.sessions).toEqual({ done: 0, planned: 3 });
    expect(result.activities).toEqual({ logged: 0, planned: 2 });
    expect(result.average).toBeNull();
    expect(result.weeks).toEqual([
      { startsOn: ANCHOR, done: 0, planned: 3 * SESSION_LOAD + PLAY_DAY_LOAD },
    ]);
    expect(result.verdict).toEqual({
      kind: VerdictKind.SessionsBehind,
      load: 3 * SESSION_LOAD + PLAY_DAY_LOAD,
      average: null,
      sessionsDone: 0,
      sessionsPlanned: 3,
    });
  });

  it('moves a finished Session and a logged play day from planned to done', () => {
    const result = progress({
      entries: [
        { date: '2026-11-06', load: 270 },
        { date: '2026-11-06', load: PLAY_DAY_LOAD },
      ],
      sessions: THREE_SESSIONS(['2026-11-06']),
      activities: [{ date: '2026-11-06', planned: true }],
    });

    expect(result.sessions).toEqual({ done: 1, planned: 3 });
    expect(result.activities).toEqual({ logged: 1, planned: 2 });
    expect(result.weeks).toEqual([
      { startsOn: ANCHOR, done: 270 + PLAY_DAY_LOAD, planned: 2 * SESSION_LOAD + PLAY_DAY_LOAD },
    ]);
    expect(result.verdict.kind).toBe(VerdictKind.NotEnoughHistory);
  });

  it('keeps a play day to come planned when only an unplanned Activity was logged that day', () => {
    const result = progress({
      sessions: [],
      activities: [{ date: '2026-11-10', planned: false }],
    });

    expect(result.activities).toEqual({ logged: 1, planned: 2 });
    expect(result.weeks.at(-1)!.planned).toBe(PLAY_DAY_LOAD);
  });

  it('does not plan a play day that has passed without a log, today and later still count', () => {
    const passed = progress({ sessions: [], today: '2026-11-07' });
    expect(passed.weeks.at(-1)!.planned).toBe(PLAY_DAY_LOAD);

    const onTheDay = progress({ sessions: [], today: '2026-11-10' });
    expect(onTheDay.weeks.at(-1)!.planned).toBe(PLAY_DAY_LOAD);

    const after = progress({ sessions: [], today: '2026-11-11' });
    expect(after.weeks.at(-1)!.planned).toBe(0);
  });

  it('calls the person behind when a Session finished early does not cover a missed one', () => {
    const result = progress({
      sessions: THREE_SESSIONS(['2026-11-08', '2026-11-11']),
      play: undefined,
    });

    expect(result.sessions).toEqual({ done: 2, planned: 3 });
    expect(result.verdict.kind).toBe(VerdictKind.SessionsBehind);
  });

  it('plans no Activities when the sport varies or there is no profile', () => {
    for (const play of [{ ...PADEL, playVaries: true }, undefined]) {
      const result = progress({ sessions: [], play });
      expect(result.activities.planned).toBe(0);
      expect(result.weeks).toEqual([{ startsOn: ANCHOR, done: 0, planned: 0 }]);
    }
  });

  it('lists the earlier weeks with data first and this week last, against the average', () => {
    const result = progress({
      entries: [
        { date: PREVIOUS_WEEK, load: 500 },
        { date: '2026-11-06', load: 100 },
      ],
      sessions: [],
      play: undefined,
    });

    expect(result.average).toBe(500);
    expect(result.weeks).toEqual([
      { startsOn: PREVIOUS_WEEK, done: 500, planned: 0 },
      { startsOn: ANCHOR, done: 100, planned: 0 },
    ]);
  });

  it('plans nothing before the anchor, so the weeks before the Program have no planned Load', () => {
    const result = progress({ entries: [{ date: PREVIOUS_WEEK, load: 500 }], sessions: [] });

    expect(result.weeks[0]).toEqual({ startsOn: PREVIOUS_WEEK, done: 500, planned: 0 });
  });

  it('counts the Load of a missed Session of an earlier week as planned in that week', () => {
    const result = progress({
      entries: [{ date: PREVIOUS_WEEK, load: 500 }],
      sessions: [session(PREVIOUS_WEEK), ...THREE_SESSIONS(['2026-11-06', '2026-11-08'])],
      play: undefined,
    });

    expect(result.weeks[0]).toEqual({ startsOn: PREVIOUS_WEEK, done: 500, planned: SESSION_LOAD });
    expect(result.sessions).toEqual({ done: 2, planned: 3 });
  });

  it('calls the week above the usual when done plus planned passes 110 percent of the average', () => {
    const result = progress({
      entries: [{ date: PREVIOUS_WEEK, load: 500 }],
      sessions: THREE_SESSIONS(['2026-11-06', '2026-11-08']),
      play: undefined,
    });

    // done 0 + one Session still to come (315) is below 450, so below the usual.
    expect(result.verdict.kind).toBe(VerdictKind.BelowUsual);

    const above = progress({
      entries: [
        { date: PREVIOUS_WEEK, load: 500 },
        { date: '2026-11-06', load: 600 },
      ],
      sessions: THREE_SESSIONS(['2026-11-06', '2026-11-08']),
      play: undefined,
    });
    expect(above.verdict).toMatchObject({
      kind: VerdictKind.AboveUsual,
      load: 600 + SESSION_LOAD,
      average: 500,
    });
  });

  it('calls the week on track when done plus planned lands within 10 percent of the average', () => {
    const result = progress({
      entries: [
        { date: PREVIOUS_WEEK, load: 500 },
        { date: '2026-11-06', load: 520 },
      ],
      sessions: [],
      play: undefined,
    });

    expect(result.verdict.kind).toBe(VerdictKind.OnTrack);
  });
});
