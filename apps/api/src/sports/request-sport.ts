import { normalizeSportName } from '@stamina/domain';
import { sql } from 'drizzle-orm';
import { SQLSTATE_TOO_MANY_SPORT_REQUESTS } from '../db/config.ts';
import type { UserTx } from '../db/types.ts';
import { TooManySportRequestsError } from './too-many-sport-requests-error.ts';

/**
 * Asks for a sport on behalf of the signed-in user (the transaction's `app.user_id`): creates the
 * draft sport for this normalized name if nobody asked before, joins it if somebody did, and
 * returns its id. Two spellings of one name are one sport. The work is the `request_sport` SQL
 * function (migration 0005), because the app role cannot write `sport`; the function takes the
 * user from the session, never from an argument. Idempotent. Returns `null` and creates nothing
 * when the name is a launch sport that is not approved yet (its draft stays unseen). Throws
 * `TooManySportRequestsError` at the limit; the caller's transaction must be rolled back.
 */
export async function requestSport(tx: UserTx, name: string): Promise<string | null> {
  try {
    const result = await tx.execute(
      sql`select request_sport(${name}, ${normalizeSportName(name)}) as id`,
    );
    return (result as unknown as { rows: { id: string | null }[] }).rows[0]!.id;
  } catch (error) {
    if ((error as { cause?: { code?: string } }).cause?.code === SQLSTATE_TOO_MANY_SPORT_REQUESTS) {
      throw new TooManySportRequestsError();
    }
    throw error;
  }
}
