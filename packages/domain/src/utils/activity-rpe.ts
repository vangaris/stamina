import { ACTIVITY_RPE_BY_INTENSITY } from '../config.ts';
import type { Intensity } from '../enums/intensity.ts';

/** The RPE an Activity counts at, from how hard the person played. */
export function activityRpe(intensity: Intensity): number {
  return ACTIVITY_RPE_BY_INTENSITY[intensity];
}
