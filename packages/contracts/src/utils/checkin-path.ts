import { ApiPath } from '../enums/api-path.ts';
import type { CheckinSubpath } from '../enums/checkin-subpath.ts';

/** `/checkins`, or `/checkins/latest`; shared by the client and the server's routes. */
export function checkinPath(subpath?: CheckinSubpath): string {
  return subpath === undefined ? ApiPath.Checkins : `${ApiPath.Checkins}/${subpath}`;
}
