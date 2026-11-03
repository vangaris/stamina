import { normalizeSportName } from '@stamina/domain';
import { sql } from 'drizzle-orm';
import type { UserTx } from '../db/types.ts';

/** SQLSTATE the `request_sport` function raises (migration 0005) at the limit of requests. */
const SQLSTATE_TOO_MANY_SPORT_REQUESTS = 'SP001';

/** The person already has the most requests on sports that are not approved yet. */
export class TooManySportRequestsError extends Error {
  constructor() {
    super('Too many sport requests.');
    this.name = 'TooManySportRequestsError';
  }
}

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

/**
 * Gives up an earlier request after a rename: the `release_sport_request` SQL function deletes the
 * requested sport when the caller was its only requester and nothing was drafted for it.
 */
export async function releaseSportRequest(tx: UserTx, name: string): Promise<void> {
  await tx.execute(sql`select release_sport_request(${normalizeSportName(name)})`);
}
