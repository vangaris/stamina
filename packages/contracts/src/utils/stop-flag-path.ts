import { ApiPath } from '../enums/api-path.ts';
import type { StopFlagSubpath } from '../enums/stop-flag-subpath.ts';

/** `/safety/stop-flags`, or `/safety/stop-flags/confirm`; shared by the client and the server's routes. */
export function stopFlagPath(subpath?: StopFlagSubpath): string {
  return subpath === undefined ? ApiPath.StopFlags : `${ApiPath.StopFlags}/${subpath}`;
}
