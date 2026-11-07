import {
  DELOAD_EFFORT_MARGIN,
  DELOAD_EFFORT_SESSIONS,
  DELOAD_LOAD_FACTOR,
  DELOAD_POOR_CHECKIN_DAYS,
  DELOAD_POOR_CHECKINS,
  FAILURE_RPE,
} from '../config.ts';
import { AdaptationRule } from '../enums/adaptation-rule.ts';
import type { AdaptationContext, AdaptationReasonParams } from '../types.ts';
import { addDays } from './add-days.ts';
import { compareText } from './compare-text.ts';
import { isPoorCheckin } from './is-poor-checkin.ts';
import { summariseWeeklyLoad } from './summarise-weekly-load.ts';

/**
 * Why an early Deload is due, or `null` when none holds. The first that holds wins, in this order:
 * - Load: this week so far and last week are each above `DELOAD_LOAD_FACTOR` times the average
 *   that last week was measured against.
 * - Check-ins: `DELOAD_POOR_CHECKINS` poor Check-ins on different days of the last
 *   `DELOAD_POOR_CHECKIN_DAYS` days, today included.
 * - Effort: each of the last `DELOAD_EFFORT_SESSIONS` finished Sessions that rated an exercise
 *   felt at least `DELOAD_EFFORT_MARGIN` RPE points harder than its target.
 */
export function deloadReason(
  context: AdaptationContext,
): { ruleId: AdaptationRule; params: AdaptationReasonParams } | null {
  const { today, programStartsOn, loadEntries, checkins, finished } = context;

  const thisWeek = summariseWeeklyLoad({ anchor: programStartsOn, today, entries: loadEntries });
  const lastWeek = summariseWeeklyLoad({
    anchor: programStartsOn,
    today: addDays(today, -7),
    entries: loadEntries,
  });
  if (lastWeek.average !== null) {
    const limit = DELOAD_LOAD_FACTOR * lastWeek.average;
    if (lastWeek.current.load > limit && thisWeek.current.load > limit) {
      return {
        ruleId: AdaptationRule.DeloadLoad,
        params: {
          load: thisWeek.current.load,
          previousLoad: lastWeek.current.load,
          average: lastWeek.average,
          percent: Math.round(DELOAD_LOAD_FACTOR * 100),
        },
      };
    }
  }

  const since = addDays(today, 1 - DELOAD_POOR_CHECKIN_DAYS);
  const poorDays = new Set(
    checkins
      .filter((checkin) => checkin.date >= since && checkin.date <= today && isPoorCheckin(checkin))
      .map(({ date }) => date),
  );
  if (poorDays.size >= DELOAD_POOR_CHECKINS) {
    return {
      ruleId: AdaptationRule.DeloadCheckins,
      params: { count: poorDays.size, days: DELOAD_POOR_CHECKIN_DAYS },
    };
  }

  const rated = finished
    .filter(({ lowestRir }) => lowestRir !== null)
    .sort((a, b) => compareText(a.finishedAt, b.finishedAt))
    .slice(-DELOAD_EFFORT_SESSIONS);
  if (
    rated.length === DELOAD_EFFORT_SESSIONS &&
    rated.every(({ rpe, lowestRir }) => rpe >= FAILURE_RPE - lowestRir! + DELOAD_EFFORT_MARGIN)
  ) {
    return {
      ruleId: AdaptationRule.DeloadEffort,
      params: { sessions: DELOAD_EFFORT_SESSIONS, margin: DELOAD_EFFORT_MARGIN },
    };
  }
  return null;
}
