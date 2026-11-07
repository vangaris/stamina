import type { Adaptation } from '@stamina/contracts';
import { AdaptationChangeKind, weekdayOf, type Weekday } from '@stamina/domain';
import { CHANGE_MESSAGE_KEYS } from '../config.ts';
import type { MessageSpec } from '../types.ts';

/** The sentence for what accepting does: days become weekday names in the person's language. */
export function toChangeMessage(
  change: Adaptation['change'],
  weekdayLabel: (weekday: Weekday) => string,
): MessageSpec {
  const key = CHANGE_MESSAGE_KEYS[change.kind];
  const day = (date: string) => weekdayLabel(weekdayOf(date));
  switch (change.kind) {
    case AdaptationChangeKind.MoveSession:
      return { key, params: { from: day(change.from), to: day(change.to) } };
    case AdaptationChangeKind.RepeatWeek:
    case AdaptationChangeKind.RestartBlock:
      return { key, params: { day: day(change.startsOn) } };
    default:
      return { key, params: {} };
  }
}
