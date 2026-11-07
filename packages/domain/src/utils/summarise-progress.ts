import { DAYS_IN_WEEK } from '../config.ts';
import type {
  LoadEntry,
  PlannedActivityInput,
  ProgressActivity,
  ProgressSession,
  ProgressSummary,
  ProgressWeekLoad,
} from '../types.ts';
import { activityLoad } from './activity-load.ts';
import { addDays } from './add-days.ts';
import { plannedActivities } from './planned-activities.ts';
import { plannedSessionLoad } from './planned-session-load.ts';
import { summariseWeeklyLoad } from './summarise-weekly-load.ts';
import { weekVerdict } from './week-verdict.ts';

/**
 * How the week that holds `today` is going. The bars are the weeks the average covers
 * (`summariseWeeklyLoad`) then this week last. `done` is a week's Load from `entries`; `planned`
 * is the Load still to come in it: each Session not finished (`plannedSessionLoad`) and each
 * planned Activity (from `play`, none when it is undefined or the sport varies) on a play day
 * that is `today` or later with no planned Activity logged (a play day that has passed without a
 * log is not still to come, so earlier weeks plan no Activity Load). The verdict (`weekVerdict`)
 * weighs those numbers for this week; each Session dated before `today` and not finished counts as
 * missed. Weeks run from `anchor`.
 */
export function summariseProgress({
  anchor,
  today,
  entries,
  sessions,
  activities,
  play,
}: {
  anchor: string;
  today: string;
  /** Every Load entry: the finished Sessions and the Activities. */
  entries: readonly LoadEntry[];
  sessions: readonly ProgressSession[];
  activities: readonly ProgressActivity[];
  play: PlannedActivityInput | undefined;
}): ProgressSummary {
  const summary = summariseWeeklyLoad({ anchor, today, entries });
  const weekStartsOn = summary.current.startsOn;
  const within = (startsOn: string) => {
    const endsBefore = addDays(startsOn, DAYS_IN_WEEK);
    return ({ date }: { date: string }) => date >= startsOn && date < endsBefore;
  };
  const playDays = (startsOn: string) =>
    play === undefined ? [] : plannedActivities(startsOn, play, anchor);

  const weeks = [...summary.previous, summary.current].map(
    ({ startsOn, load }): ProgressWeekLoad => {
      const inWeek = within(startsOn);
      const played = new Set(
        activities
          .filter((activity) => activity.planned && inWeek(activity))
          .map(({ date }) => date),
      );
      let planned = 0;
      for (const session of sessions) {
        if (!session.finished && inWeek(session)) {
          planned += plannedSessionLoad(session.weekInBlock, session.minutes);
        }
      }
      for (const day of playDays(startsOn)) {
        if (day.date >= today && !played.has(day.date)) {
          planned += activityLoad(day.intensity, day.minutes);
        }
      }
      return { startsOn, done: load, planned };
    },
  );

  const inCurrentWeek = within(weekStartsOn);
  const weekSessions = sessions.filter(inCurrentWeek);
  const sessionsDone = weekSessions.filter(({ finished }) => finished).length;
  const current = weeks.at(-1)!;

  return {
    weekStartsOn,
    sessions: { done: sessionsDone, planned: weekSessions.length },
    activities: {
      logged: activities.filter(inCurrentWeek).length,
      planned: playDays(weekStartsOn).length,
    },
    weeks,
    average: summary.average,
    verdict: {
      kind: weekVerdict({
        done: current.done,
        planned: current.planned,
        average: summary.average,
        sessionsMissed: weekSessions.filter(({ date, finished }) => date < today && !finished)
          .length,
      }),
      load: current.done + current.planned,
      average: summary.average,
      sessionsDone,
      sessionsPlanned: weekSessions.length,
    },
  };
}
