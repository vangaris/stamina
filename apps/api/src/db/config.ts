/**
 * The role every user-owned query runs as (see `with-user.ts`). It is NOLOGIN, has no BYPASSRLS
 * and owns nothing, so row-level security always applies to it. Created by the migration.
 */
export const APP_ROLE = 'stamina_app';

/** Transaction-local setting that carries the signed-in user's ID to the RLS policies. */
export const USER_ID_SETTING = 'app.user_id';
