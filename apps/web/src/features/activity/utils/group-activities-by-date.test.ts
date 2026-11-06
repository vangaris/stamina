import { Intensity } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { ActivityStatus } from '../enums/activity-status.ts';
import {
  makeLoggedActivity,
  makePlannedActivity,
  makeWeekLoad,
} from '../testing/make-week-load.ts';
import { groupActivitiesByDate } from './group-activities-by-date.ts';

describe('groupActivitiesByDate', () => {
  it('shows a planned Activity that is still to do, with no Load yet', () => {
    const week = makeWeekLoad({ plannedActivities: [makePlannedActivity()] });

    expect(groupActivitiesByDate(week)['2026-11-10']).toEqual([
      expect.objectContaining({
        status: ActivityStatus.Planned,
        minutes: 90,
        intensity: Intensity.Moderate,
        load: undefined,
      }),
    ]);
  });

  it('replaces a planned Activity by the one played on that play day, with its Load', () => {
    const played = makeLoggedActivity({ planned: true, minutes: 60, intensity: Intensity.Hard });
    const week = makeWeekLoad({
      plannedActivities: [makePlannedActivity({ loggedActivityId: played.id })],
      activities: [played],
    });

    const day = groupActivitiesByDate(week)['2026-11-10'];

    expect(day).toHaveLength(1);
    expect(day?.[0]).toMatchObject({
      key: played.id,
      status: ActivityStatus.Done,
      minutes: 60,
      load: played.load,
    });
  });

  it('adds an unplanned Activity on its own day, after the planned one', () => {
    const extra = makeLoggedActivity({ id: '20000000-0000-4000-8000-000000000002' });
    const week = makeWeekLoad({
      plannedActivities: [makePlannedActivity()],
      activities: [extra],
    });

    const day = groupActivitiesByDate(week)['2026-11-10'];

    expect(day?.map(({ status }) => status)).toEqual([ActivityStatus.Planned, ActivityStatus.Done]);
  });

  it('has no planned Activities when the sport varies, only what was played', () => {
    const played = makeLoggedActivity({ date: '2026-11-08' });
    const week = makeWeekLoad({ plannedActivities: [], activities: [played] });

    const byDate = groupActivitiesByDate(week);

    expect(Object.keys(byDate)).toEqual(['2026-11-08']);
    expect(byDate['2026-11-08']?.[0]?.status).toBe(ActivityStatus.Done);
  });

  it('is empty for an empty week', () => {
    expect(groupActivitiesByDate(makeWeekLoad())).toEqual({});
  });
});
