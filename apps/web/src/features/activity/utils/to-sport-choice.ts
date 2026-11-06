import { SportKind } from '@stamina/contracts';
import type { ActivitySport, SportChoice } from '../types.ts';

/** What the sport select holds for a sport. */
export function toSportChoice(sport: ActivitySport): SportChoice {
  return sport.kind === SportKind.Launch ? sport.sport : SportKind.Other;
}
