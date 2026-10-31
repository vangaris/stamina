import { sql } from 'drizzle-orm';
import { APP_ROLE, USER_ID_SETTING } from './config.ts';
import type { Db, UserTx } from './types.ts';

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
