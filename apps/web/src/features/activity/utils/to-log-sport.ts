import { SportKind } from '@stamina/contracts';
import type { ActivitySport, SportChoice } from '../types.ts';

/**
 * The sport to send for a choice. "Other" is the person's own sport from the profile; without
 * one (no profile read) there is nothing to name, so it is not sent.
 */
export function toLogSport(
  choice: SportChoice,
  otherSportName: string | undefined,
): ActivitySport | undefined {
  if (choice !== SportKind.Other) return { kind: SportKind.Launch, sport: choice };
  return otherSportName === undefined ? undefined : { kind: SportKind.Other, name: otherSportName };
}
