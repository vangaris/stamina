import { DAYS_OFF_TO_RESTART, MISSED_SESSIONS_TO_REPEAT } from '../config.ts';
import { AdaptationChangeKind } from '../enums/adaptation-change-kind.ts';
import { AdaptationRule } from '../enums/adaptation-rule.ts';
import type { AdaptationContext, AdaptationProposal } from '../types.ts';
import { addDays } from './add-days.ts';
import { daysBetween } from './days-between.ts';
import { isRaised } from './is-raised.ts';

/**
 * Rule 5: Sessions of the week left undone. `DAYS_OFF_TO_RESTART` days without a finished Session
 * restart the Block from tomorrow (and win over a repeat); otherwise `MISSED_SESSIONS_TO_REPEAT`
 * unfinished Sessions dated before today repeat the week from tomorrow. One missed Session is
 * skipped, never stacked. Neither is asked again after a decision.
 */
export function proposeMissedSessions(context: AdaptationContext): AdaptationProposal[] {
  const { today, history, sessions, finished, programStartsOn, weekStartsOn, weekInBlock } =
    context;
  const unfinished = sessions.filter((session) => !session.finished);
  const basis = unfinished.map(({ id, revision }) => ({ sessionId: id, revision }));
  const startsOn = addDays(today, 1);

  const lastFinishedDate = finished.reduce<string | null>(
    (latest, { date }) => (latest === null || date > latest ? date : latest),
    null,
  );
  const since = lastFinishedDate ?? programStartsOn;
  const daysOff = daysBetween(since, today);
  if (daysOff >= DAYS_OFF_TO_RESTART && unfinished.length > 0) {
    if (isRaised(history, AdaptationRule.RestartBlock, since)) return [];
    return [
      {
        ruleId: AdaptationRule.RestartBlock,
        triggerKey: since,
        ask: 1,
        change: { kind: AdaptationChangeKind.RestartBlock, startsOn },
        params: { daysOff },
        basis,
        validUntil: null,
      },
    ];
  }

  const missed = unfinished.filter((session) => session.date < today).length;
  if (missed < MISSED_SESSIONS_TO_REPEAT) return [];
  if (isRaised(history, AdaptationRule.RepeatWeek, weekStartsOn)) return [];
  return [
    {
      ruleId: AdaptationRule.RepeatWeek,
      triggerKey: weekStartsOn,
      ask: 1,
      change: { kind: AdaptationChangeKind.RepeatWeek, startsOn, weekInBlock },
      params: { missed, weekInBlock },
      basis,
      validUntil: null,
    },
  ];
}
