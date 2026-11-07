import { DAYS_OFF_TO_RESTART, MISSED_SESSIONS_TO_REPEAT } from '../config.ts';
import { AdaptationChangeKind } from '../enums/adaptation-change-kind.ts';
import { AdaptationRule } from '../enums/adaptation-rule.ts';
import type { AdaptationContext, AdaptationProposal } from '../types.ts';
import { addDays } from './add-days.ts';
import { daysBetween } from './days-between.ts';
import { nextAsk } from './next-ask.ts';

/**
 * Rule 5: Sessions of the week left undone. `DAYS_OFF_TO_RESTART` days without a finished Session
 * restart the Block from tomorrow (and win over a repeat); otherwise `MISSED_SESSIONS_TO_REPEAT`
 * unfinished Sessions dated before today repeat the week from tomorrow. One missed Session is
 * skipped, never stacked. The week replaces the Sessions nothing was done in, so there must be one;
 * it is never asked again after a decision, and asked again at once when the Sessions it was
 * raised on moved on (`nextAsk`).
 */
export function proposeMissedSessions(context: AdaptationContext): AdaptationProposal[] {
  const { today, sessions, finished, programStartsOn, weekStartsOn, weekInBlock } = context;
  const revisable = sessions.filter((session) => !session.finished && !session.started);
  if (revisable.length === 0) return [];
  const basis = revisable.map(({ id, revision }) => ({ sessionId: id, revision }));
  const startsOn = addDays(today, 1);

  const lastFinishedDate = finished.reduce<string | null>(
    (latest, { date }) => (latest === null || date > latest ? date : latest),
    null,
  );
  const since = lastFinishedDate ?? programStartsOn;
  const daysOff = daysBetween(since, today);
  if (daysOff >= DAYS_OFF_TO_RESTART) {
    const ask = nextAsk(context, AdaptationRule.RestartBlock, since);
    if (ask === null) return [];
    return [
      {
        ruleId: AdaptationRule.RestartBlock,
        triggerKey: since,
        ask,
        change: { kind: AdaptationChangeKind.RestartBlock, startsOn },
        params: { daysOff },
        basis,
        validUntil: null,
      },
    ];
  }

  const missed = sessions.filter((session) => !session.finished && session.date < today).length;
  if (missed < MISSED_SESSIONS_TO_REPEAT) return [];
  const ask = nextAsk(context, AdaptationRule.RepeatWeek, weekStartsOn);
  if (ask === null) return [];
  return [
    {
      ruleId: AdaptationRule.RepeatWeek,
      triggerKey: weekStartsOn,
      ask,
      change: { kind: AdaptationChangeKind.RepeatWeek, startsOn, weekInBlock },
      params: { missed, weekInBlock },
      basis,
      validUntil: null,
    },
  ];
}
