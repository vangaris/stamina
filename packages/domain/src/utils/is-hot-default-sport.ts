import { HOT_DEFAULT_SPORTS } from '../config.ts';
import type { LaunchSport } from '../enums/launch-sport.ts';

/** Kitesurfing, windsurfing and beach volleyball default to "hot conditions". */
export function isHotDefaultSport(sport: LaunchSport): boolean {
  return HOT_DEFAULT_SPORTS.includes(sport);
}
