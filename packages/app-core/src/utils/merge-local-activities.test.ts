import { SportKind, type LoggedActivity, type WeekLoad } from '@stamina/contracts';
import { activityLoad, ActivitySource, Intensity, LaunchSport, Weekday } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import type { LocalActivity } from '../types.ts';
import { mergeLocalActivities } from './merge-local-activities.ts';

const SPORT = { kind: SportKind.Launch, sport: LaunchSport.Padel } as const;
const ID_A = '00000000-0000-4000-8000-00000000000a';
const ID_B = '00000000-0000-4000-8000-00000000000b';
const ID_C = '00000000-0000-4000-8000-00000000000c';

const local = (id: string, date: string, recordedAt: string, minutes = 60): LocalActivity => ({
  activity: { id, sport: SPORT, date, minutes, intensity: Intensity.Hard, hot: false },
  recordedAt,
});

const week = (overrides: Partial<WeekLoad> = {}): WeekLoad => ({
  startsOn: '2026-11-02',
  sessionLoad: 100,
  activityLoad: 0,
  load: 100,
  average: 250,
  previous: [{ startsOn: '2026-10-26', load: 250 }],
  plannedActivities: [
    {
      date: '2026-11-04',
      weekday: Weekday.Wed,
      sport: SPORT,
      minutes: 60,
      intensity: Intensity.Hard,
      loggedActivityId: null,
    },
  ],
  activities: [],
  ...overrides,
});

const HARD_HOUR = activityLoad(Intensity.Hard, 60);

describe('mergeLocalActivities', () => {
  it('returns the week as it is when nothing local is new', () => {
    const server = week();

    expect(mergeLocalActivities(server, [])).toBe(server);
  });

  it('adds a local Activity with its Load, planned flag and the filled play day', () => {
    const merged = mergeLocalActivities(week(), [
      local(ID_A, '2026-11-04', '2026-11-04T10:00:00Z'),
    ]);

    expect(merged.activities).toEqual([
      expect.objectContaining({
        id: ID_A,
        rpe: expect.any(Number),
        load: HARD_HOUR,
        planned: true,
        source: ActivitySource.Manual,
        loggedAt: '2026-11-04T10:00:00Z',
      }),
    ]);
    expect(merged.plannedActivities[0]?.loggedActivityId).toBe(ID_A);
    expect(merged.activityLoad).toBe(HARD_HOUR);
    expect(merged.load).toBe(100 + HARD_HOUR);
  });

  it('marks an Activity on an unplanned day as not planned and leaves the play day open', () => {
    const merged = mergeLocalActivities(week(), [
      local(ID_A, '2026-11-03', '2026-11-03T10:00:00Z'),
    ]);

    expect(merged.activities[0]?.planned).toBe(false);
    expect(merged.plannedActivities[0]?.loggedActivityId).toBeNull();
  });

  it('fills a play day with the first planned Activity by loggedAt', () => {
    const merged = mergeLocalActivities(week(), [
      local(ID_B, '2026-11-04', '2026-11-04T12:00:00Z'),
      local(ID_A, '2026-11-04', '2026-11-04T10:00:00Z'),
    ]);

    expect(merged.activities.map(({ id }) => id)).toEqual([ID_A, ID_B]);
    expect(merged.plannedActivities[0]?.loggedActivityId).toBe(ID_A);
  });

  it('lets the server copy win by id and keeps a filled play day', () => {
    const stored: LoggedActivity = {
      id: ID_A,
      sport: SPORT,
      date: '2026-11-04',
      minutes: 60,
      intensity: Intensity.Hard,
      hot: false,
      rpe: 8,
      load: HARD_HOUR,
      planned: true,
      source: ActivitySource.Manual,
      loggedAt: '2026-11-04T09:00:00Z',
    };
    const server = week({
      activityLoad: HARD_HOUR,
      load: 100 + HARD_HOUR,
      activities: [stored],
      plannedActivities: [{ ...week().plannedActivities[0]!, loggedActivityId: ID_A }],
    });

    const merged = mergeLocalActivities(server, [
      local(ID_A, '2026-11-04', '2026-11-04T10:00:00Z', 90),
      local(ID_B, '2026-11-05', '2026-11-05T10:00:00Z'),
    ]);

    expect(merged.activities.map(({ id }) => id)).toEqual([ID_A, ID_B]);
    expect(merged.activities[0]).toBe(stored);
    expect(merged.activityLoad).toBe(2 * HARD_HOUR);
    expect(merged.plannedActivities[0]?.loggedActivityId).toBe(ID_A);
  });

  it('ignores Activities outside the week', () => {
    const server = week();

    const merged = mergeLocalActivities(server, [
      local(ID_A, '2026-11-01', '2026-11-01T10:00:00Z'),
      local(ID_B, '2026-11-09', '2026-11-09T10:00:00Z'),
      local(ID_C, '2026-11-08', '2026-11-08T10:00:00Z'),
    ]);

    expect(merged.activities.map(({ id }) => id)).toEqual([ID_C]);
  });

  it('never touches the average or the previous weeks, and does not change its inputs', () => {
    const server = week();
    const snapshot = structuredClone(server);

    const merged = mergeLocalActivities(server, [
      local(ID_A, '2026-11-04', '2026-11-04T10:00:00Z'),
    ]);

    expect(merged.average).toBe(250);
    expect(merged.previous).toEqual(server.previous);
    expect(server).toEqual(snapshot);
  });
});
