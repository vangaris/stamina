import { SportKind } from '@stamina/contracts';
import type { ActivitySport } from '../types.ts';

/** How a sport reads: a launch sport by its translated name, a sport of the person's own by the name they gave it. */
export function toSportLabel(sport: ActivitySport, translate: (key: string) => string): string {
  return sport.kind === SportKind.Launch
    ? translate(`onboarding.sport.sport.options.${sport.sport}`)
    : sport.name;
}
