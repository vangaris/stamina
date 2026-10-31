import { sql } from 'drizzle-orm';
import type { Db } from './types.ts';
import { APP_ROLE, USER_ID_SETTING } from './config.ts';

/** The transaction handle `fn` receives; the same shape on the `pg` and Neon serverless drivers. */
export type UserTx = Parameters<Parameters<Db['transaction']>[0]>[0];

/**
 * The only way user-owned tables are touched. Runs `fn` in one transaction as the `stamina_app`
 * role with `app.user_id` set to `userId`, so row-level security limits every statement to that
 * user's rows.
 *
 * Why not query directly: Neon owner roles and local superusers bypass RLS, so a plain `db`
 * query sees every user's rows. `SET LOCAL` and `set_config(..., true)` both end with the
 * transaction, so a pooled connection never carries one user's identity into the next request.
 * `userId` must be a UUID (the verified JWT `sub`); anything else fails closed in the policy cast.
 */
export function withUser<T>(db: Db, userId: string, fn: (tx: UserTx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql.raw(`set local role ${APP_ROLE}`));
    await tx.execute(sql`select set_config(${USER_ID_SETTING}, ${userId}, true)`);
    return fn(tx);
  });
}
