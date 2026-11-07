import { ADAPTATION_LOOKBACK_DAYS, SORE_AREA_SORENESS } from '../config.ts';
import { AdaptationChangeKind } from '../enums/adaptation-change-kind.ts';
import { AdaptationRule } from '../enums/adaptation-rule.ts';
import type { AdaptationContext, AdaptationProposal } from '../types.ts';
import { compareText } from './compare-text.ts';
import { daysBetween } from './days-between.ts';
import { heavySessions } from './heavy-sessions.ts';
import { isPoorCheckin } from './is-poor-checkin.ts';
import { isRaised } from './is-raised.ts';
import { lightenExercises } from './lighten-exercises.ts';
import { recoveryExercises } from './recovery-exercises.ts';
import { swapSessionExercises } from './swap-session-exercises.ts';
import { targetedAreas } from './targeted-areas.ts';

/**
 * Rules 2 and 3: a poor Check-in lightens (or makes a Recovery Session of) the heavy Session of
 * its day; a Check-in that is not poor but reports soreness swaps the exercises that load the
 * areas the Session targets, or, when every one of them cannot be replaced (most library
 * exercises load several areas, so a swap often has no candidate), lightens the Session instead.
 * A good Check-in produces nothing. Raised on the Check-in's id.
 */
export function proposeCheckins(context: AdaptationContext): AdaptationProposal[] {
  const { today, history } = context;
  const heavy = heavySessions(context);
  const checkins = context.checkins
    .filter(({ date }) => daysBetween(date, today) <= ADAPTATION_LOOKBACK_DAYS)
    .sort((a, b) => compareText(a.date, b.date) || compareText(a.id, b.id));

  const proposals: AdaptationProposal[] = [];
  for (const checkin of checkins) {
    const session = heavy.find(({ date }) => date === checkin.date);
    if (session === undefined) continue;
    const basis = [{ sessionId: session.id, revision: session.revision }];

    if (isPoorCheckin(checkin)) {
      if (isRaised(history, AdaptationRule.PoorCheckin, checkin.id)) continue;
      const change =
        lightenExercises(session.exercises) !== null
          ? { kind: AdaptationChangeKind.LightenSession as const, sessionId: session.id }
          : recoveryExercises(context, session) !== null
            ? { kind: AdaptationChangeKind.SwapToRecovery as const, sessionId: session.id }
            : null;
      if (change === null) continue;
      proposals.push({
        ruleId: AdaptationRule.PoorCheckin,
        triggerKey: checkin.id,
        ask: 1,
        change,
        params: { sleep: checkin.sleep, soreness: checkin.soreness, energy: checkin.energy },
        basis,
        validUntil: checkin.date,
      });
    } else if (checkin.soreness <= SORE_AREA_SORENESS) {
      if (isRaised(history, AdaptationRule.SoreArea, checkin.id)) continue;
      const areas = targetedAreas(context, session);
      if (areas.length === 0) continue;
      const change =
        swapSessionExercises(context, session, areas) !== null
          ? { kind: AdaptationChangeKind.SwapExercises as const, sessionId: session.id, areas }
          : lightenExercises(session.exercises) !== null
            ? { kind: AdaptationChangeKind.LightenSession as const, sessionId: session.id }
            : null;
      if (change === null) continue;
      proposals.push({
        ruleId: AdaptationRule.SoreArea,
        triggerKey: checkin.id,
        ask: 1,
        change,
        params: { soreness: checkin.soreness },
        basis,
        validUntil: checkin.date,
      });
    }
  }
  return proposals;
}
