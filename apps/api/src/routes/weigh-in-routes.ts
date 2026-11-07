import { HttpStatus, logWeighInResultSchema, logWeighInSchema } from '@stamina/contracts';
import { Hono } from 'hono';
import { authenticate, requireUserId, type TokenVerifier } from '../auth/index.ts';
import type { Db } from '../db/types.ts';
import { ApiErrorCode } from '../enums/api-error-code.ts';
import type { AppEnv } from '../request-log.ts';
import { logWeighIn } from '../weigh-ins/index.ts';

/**
 * `POST /weigh-ins`: one weekly weigh-in in kilograms (`200` with what was stored). A weight
 * outside the accepted range, or a day further ahead than a device clock explains or older than
 * `MAX_WEIGH_IN_PAST_DAYS`, is a `400`.
 * Bodies are health data: never logged, and an invalid body is never echoed.
 */
export function weighInRoutes({ db, auth, now }: { db: Db; auth: TokenVerifier; now: () => Date }) {
  const routes = new Hono<AppEnv>();

  routes.post('/', authenticate(auth), async (c) => {
    const body = logWeighInSchema.safeParse(await c.req.json().catch(() => undefined));
    if (!body.success) {
      return c.json({ error: ApiErrorCode.InvalidRequest }, HttpStatus.BadRequest);
    }

    const stored = await logWeighIn(db, requireUserId(c), body.data, now());
    if (stored === null) {
      return c.json({ error: ApiErrorCode.InvalidRequest }, HttpStatus.BadRequest);
    }
    return c.json(logWeighInResultSchema.parse(stored));
  });

  return routes;
}
