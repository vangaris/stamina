import type { UserTx } from '../db/types.ts';
import { readSupersedingSessionId } from './read-superseding-session-id.ts';

/**
 * The id of the Session's current revision: itself while nothing replaced it, else the end of the
 * chain of revisions that replaced it (an accepted Adaptation never leaves a loop). An unknown id
 * comes back as it is.
 */
export async function resolveCurrentSessionId(tx: UserTx, sessionId: string): Promise<string> {
  let current = sessionId;
  for (let next = await readSupersedingSessionId(tx, current); next !== null;) {
    current = next;
    next = await readSupersedingSessionId(tx, current);
  }
  return current;
}
