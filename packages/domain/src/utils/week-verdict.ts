import { VOLUME_FLEX } from '../config.ts';
import { VerdictKind } from '../enums/verdict-kind.ts';
import type { WeekVerdictInput } from '../types.ts';

/**
 * How the week is going, in one phrase. A Session dated earlier this week and not finished comes
 * first (`SessionsBehind`, whatever else was finished: a Session done early does not make up for
 * a missed one). With no average to compare against it is `NotEnoughHistory`. Otherwise the
 * projected week (done plus planned) is compared with the average: within `VOLUME_FLEX` either
 * way is `OnTrack`, past it `AboveUsual` or `BelowUsual`.
 */
export function weekVerdict({
  done,
  planned,
  average,
  sessionsMissed,
}: WeekVerdictInput): VerdictKind {
  if (sessionsMissed > 0) return VerdictKind.SessionsBehind;
  if (average === null) return VerdictKind.NotEnoughHistory;

  const projected = done + planned;
  if (projected > average * (1 + VOLUME_FLEX)) return VerdictKind.AboveUsual;
  if (projected < average * (1 - VOLUME_FLEX)) return VerdictKind.BelowUsual;
  return VerdictKind.OnTrack;
}
