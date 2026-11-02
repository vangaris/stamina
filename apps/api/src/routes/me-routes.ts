import { HttpStatus, meResponseSchema } from '@stamina/contracts';
import { Hono } from 'hono';
import { authenticate, requireUserId, type TokenVerifier } from '../auth/index.ts';
import type { Db } from '../db/types.ts';
import { appUser } from '../db/schema.ts';
import { withUser } from '../db/with-user.ts';
import type { AppEnv } from '../request-log.ts';
import { deleteUser } from '../safety/delete-user.ts';

/**
 * `GET /me`: the signed-in user's ID. The first call after sign-in creates the `app_user` row;
 * later calls (and concurrent ones) leave it untouched. `DELETE /me` hard-deletes that row and
 * with it everything the user owns.
 */
export function meRoutes({ db, auth }: { db: Db; auth: TokenVerifier }) {
  const routes = new Hono<AppEnv>();
  routes.get('/', authenticate(auth), async (c) => {
    const userId = requireUserId(c);
    await withUser(db, userId, (tx) =>
      tx.insert(appUser).values({ id: userId }).onConflictDoNothing(),
    );
    return c.json(meResponseSchema.parse({ userId }));
  });
  routes.delete('/', authenticate(auth), async (c) => {
    await deleteUser(db, requireUserId(c));
    return c.body(null, HttpStatus.NoContent);
  });
  return routes;
}
