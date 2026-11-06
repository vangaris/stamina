import { activityLoad, activityRpe, type Intensity } from '@stamina/domain';
import type { LoadPreview } from '../types.ts';

/** The Load a draft would count for, worked out the way the server does when it is saved. */
export function toLoadPreview(minutes: number, intensity: Intensity): LoadPreview {
  return { minutes, rpe: activityRpe(intensity), load: activityLoad(intensity, minutes) };
}
