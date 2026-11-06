import { ApiPath } from '../enums/api-path.ts';
import type { ActivitySubpath } from '../enums/activity-subpath.ts';

/** `/activities`, or `/activities/week`; shared by the client and the server's routes. */
export function activityPath(subpath?: ActivitySubpath): string {
  return subpath === undefined ? ApiPath.Activities : `${ApiPath.Activities}/${subpath}`;
}
