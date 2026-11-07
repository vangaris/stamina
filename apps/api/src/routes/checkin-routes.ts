import {
  CheckinSubpath,
  HttpStatus,
  latestCheckinResponseSchema,
  submitCheckinResultSchema,
  submitCheckinSchema,
} from '@stamina/contracts';
import { Hono } from 'hono';
import { authenticate, requireUserId, type TokenVerifier } from '../auth/index.ts';
import { CheckinIdTakenError, readLatestCheckin, submitCheckin } from '../checkins/index.ts';
import type { Db } from '../db/types.ts';
import { withUser } from '../db/with-user.ts';
import { ApiErrorCode } from '../enums/api-error-code.ts';
import type { AppEnv } from '../request-log.ts';

/**
 * Check-ins: `POST /checkins` (one daily Check-in: `200` `Saved`, `409` when the id belongs to
 * someone else) and `GET /checkins/latest` (the latest one, or `{ checkin: null }`). A repeated id
 * is replay-safe, so a client may resend until it hears back. Bodies are health data: never
 * logged, and an invalid body is never echoed.
 */
export function checkinRoutes({ db, auth }: { db: Db; auth: TokenVerifier }) {
  const routes = new Hono<AppEnv>();

  routes.post('/', authenticate(auth), async (c) => {
    const body = submitCheckinSchema.safeParse(await c.req.json().catch(() => undefined));
    if (!body.success) {
      return c.json({ error: ApiErrorCode.InvalidRequest }, HttpStatus.BadRequest);
    }

    try {
      const result = await submitCheckin(db, requireUserId(c), body.data);
      return c.json(submitCheckinResultSchema.parse(result));
    } catch (error) {
      if (error instanceof CheckinIdTakenError) {
        return c.json({ error: ApiErrorCode.IdTaken }, HttpStatus.Conflict);
      }
      throw error;
    }
  });

  routes.get(`/${CheckinSubpath.Latest}`, authenticate(auth), async (c) => {
    const userId = requireUserId(c);
    const latest = await withUser(db, userId, (tx) => readLatestCheckin(tx, userId));
    return c.json(latestCheckinResponseSchema.parse({ checkin: latest }));
  });

  return routes;
}
