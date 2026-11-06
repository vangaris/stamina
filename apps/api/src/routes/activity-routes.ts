import {
  ActivitySubpath,
  HttpStatus,
  RecordStatus,
  logActivityResultSchema,
  logActivitySchema,
  weekLoadSchema,
} from '@stamina/contracts';
import { Hono } from 'hono';
import { authenticate, requireUserId, type TokenVerifier } from '../auth/index.ts';
import type { Db } from '../db/types.ts';
import { withUser } from '../db/with-user.ts';
import { ApiErrorCode } from '../enums/api-error-code.ts';
import type { AppEnv } from '../request-log.ts';
import { ActivityIdTakenError, logActivity, readWeekLoad } from '../activities/index.ts';

/**
 * Activities: `POST /activities` (one "I played": `200` `Saved`, `422` `Rejected` for a day out of
 * range, `409` when the id belongs to someone else) and `GET /activities/week` (the week that
 * holds today with its Load, average and planned Activities). A repeated id is replay-safe, so a
 * client may resend until it hears back. Bodies are health-adjacent: never logged, and an invalid
 * body is never echoed.
 */
export function activityRoutes({
  db,
  auth,
  now,
}: {
  db: Db;
  auth: TokenVerifier;
  now: () => Date;
}) {
  const routes = new Hono<AppEnv>();

  routes.post('/', authenticate(auth), async (c) => {
    const body = logActivitySchema.safeParse(await c.req.json().catch(() => undefined));
    if (!body.success) {
      return c.json({ error: ApiErrorCode.InvalidRequest }, HttpStatus.BadRequest);
    }

    try {
      const result = await logActivity(db, requireUserId(c), body.data, now());
      return c.json(
        logActivityResultSchema.parse(result),
        result.status === RecordStatus.Saved ? HttpStatus.Ok : HttpStatus.UnprocessableEntity,
      );
    } catch (error) {
      if (error instanceof ActivityIdTakenError) {
        return c.json({ error: ApiErrorCode.IdTaken }, HttpStatus.Conflict);
      }
      throw error;
    }
  });

  routes.get(`/${ActivitySubpath.Week}`, authenticate(auth), async (c) => {
    const userId = requireUserId(c);
    const week = await withUser(db, userId, (tx) => readWeekLoad(tx, userId, now()));
    return c.json(weekLoadSchema.parse(week));
  });

  return routes;
}
