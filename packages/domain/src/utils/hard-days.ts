import { Intensity } from '../enums/intensity.ts';
import type { Weekday } from '../enums/weekday.ts';
import type { PlayPattern } from '../types.ts';

/**
 * The weekdays with a known hard Activity: the play days when the usual intensity is Hard.
 * "It varies" means no known hard days, so there are none then.
 */
export function hardDays({ playDays, playVaries, playIntensity }: PlayPattern): Weekday[] {
  return playIntensity === Intensity.Hard && !playVaries ? [...playDays] : [];
}
