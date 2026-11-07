import { progressSchema } from '@stamina/contracts';
import { Hono } from 'hono';
import { authenticate, requireUserId, type TokenVerifier } from '../auth/index.ts';
import type { Db } from '../db/types.ts';
import { withUser } from '../db/with-user.ts';
import { readProgress } from '../progress/index.ts';
import type { AppEnv } from '../request-log.ts';

/**
 * `GET /progress`: how the week that holds today is going against the person's own usual
 * (Sessions, Activities, the Load bars, the verdict and whether a weigh-in is due). The
 * response is health data: never logged.
 */
export function progressRoutes({
  db,
  auth,
  now,
}: {
  db: Db;
  auth: TokenVerifier;
  now: () => Date;
}) {
  const routes = new Hono<AppEnv>();

  routes.get('/', authenticate(auth), async (c) => {
    const userId = requireUserId(c);
    const progress = await withUser(db, userId, (tx) => readProgress(tx, userId, now()));
    return c.json(progressSchema.parse(progress));
  });

  return routes;
}
