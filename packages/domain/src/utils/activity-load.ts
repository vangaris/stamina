import type { Intensity } from '../enums/intensity.ts';
import { activityRpe } from './activity-rpe.ts';
import { sessionLoad } from './session-load.ts';

/** An Activity's Load: the RPE its intensity counts at times the minutes played. */
export function activityLoad(intensity: Intensity, minutes: number): number {
  return sessionLoad(activityRpe(intensity), minutes);
}
