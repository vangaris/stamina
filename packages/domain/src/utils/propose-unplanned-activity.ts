import { ADAPTATION_LOOKBACK_DAYS, HOURS_PER_DAY } from '../config.ts';
import { AdaptationChangeKind } from '../enums/adaptation-change-kind.ts';
import { AdaptationRule } from '../enums/adaptation-rule.ts';
import { Intensity } from '../enums/intensity.ts';
import type {
  ActivityFact,
  AdaptationChange,
  AdaptationContext,
  AdaptationProposal,
  AdaptationSession,
} from '../types.ts';
import { compareText } from './compare-text.ts';
import { daysBetween } from './days-between.ts';
import { dropSets } from './drop-sets.ts';
import { heavySessions } from './heavy-sessions.ts';
import { isRaised } from './is-raised.ts';
import { moveDestination } from './move-destination.ts';
import { recoveryExercises } from './recovery-exercises.ts';
import { recoveryWindowHours } from './recovery-window-hours.ts';

/** The first change that fits: move the Session, else make it a Recovery Session, else drop a set; `null` when none. */
function changeFor(
  context: AdaptationContext,
  session: AdaptationSession,
  activity: ActivityFact,
): AdaptationChange | null {
  const to = moveDestination(context, session, activity);
  if (to !== null) {
    return {
      kind: AdaptationChangeKind.MoveSession,
      sessionId: session.id,
      from: session.date,
      to,
    };
  }
  if (recoveryExercises(context, session) !== null) {
    return { kind: AdaptationChangeKind.SwapToRecovery, sessionId: session.id };
  }
  if (dropSets(session.exercises) !== null) {
    return { kind: AdaptationChangeKind.DropSet, sessionId: session.id };
  }
  return null;
}

/**
 * Rule 1: an unplanned hard Activity whose day is inside the recovery window before the next
 * heavy Session. One suggestion per Activity, raised on the Activity's id.
 */
export function proposeUnplannedActivity(context: AdaptationContext): AdaptationProposal[] {
  const { today, history } = context;
  const heavy = heavySessions(context);
  const activities = context.activities
    .filter(
      (activity) =>
        !activity.planned &&
        activity.intensity === Intensity.Hard &&
        daysBetween(activity.date, today) <= ADAPTATION_LOOKBACK_DAYS &&
        !isRaised(history, AdaptationRule.UnplannedActivity, activity.id),
    )
    .sort((a, b) => compareText(a.date, b.date) || compareText(a.id, b.id));

  const proposals: AdaptationProposal[] = [];
  for (const activity of activities) {
    const from = activity.date > today ? activity.date : today;
    const session = heavy.find(({ date }) => date >= from);
    if (session === undefined) continue;
    const hours = daysBetween(activity.date, session.date) * HOURS_PER_DAY;
    const windowHours = recoveryWindowHours(context.generation.sport, session.focus);
    if (hours > windowHours) continue;
    const change = changeFor(context, session, activity);
    if (change === null) continue;
    proposals.push({
      ruleId: AdaptationRule.UnplannedActivity,
      triggerKey: activity.id,
      ask: 1,
      change,
      params: { load: activity.load, minutes: activity.minutes, hours, windowHours },
      basis: [{ sessionId: session.id, revision: session.revision }],
      validUntil: session.date,
    });
  }
  return proposals;
}
