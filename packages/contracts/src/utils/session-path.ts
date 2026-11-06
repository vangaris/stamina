import { ApiPath } from '../enums/api-path.ts';
import type { SessionSubpath } from '../enums/session-subpath.ts';

/** `/sessions/{id}`, or `/sessions/{id}/sets` and `/sessions/{id}/finish`; shared by the client and the server's routes. */
export function sessionPath(sessionId: string, subpath?: SessionSubpath): string {
  const base = `${ApiPath.Sessions}/${sessionId}`;
  return subpath === undefined ? base : `${base}/${subpath}`;
}
