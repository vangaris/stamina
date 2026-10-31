import { meResponseSchema } from '@stamina/contracts';
import { Hono } from 'hono';
import { authenticate, requireUserId, type TokenVerifier } from '../auth/index.ts';
import type { Db } from '../db/client.ts';
import { appUser } from '../db/schema.ts';
import { withUser } from '../db/with-user.ts';
import type { AppEnv } from '../request-log.ts';

/**
 * `GET /me`: the signed-in user's ID. The first call after sign-in creates the `app_user` row;
 * later calls (and concurrent ones) leave it untouched.
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
  return routes;
}
