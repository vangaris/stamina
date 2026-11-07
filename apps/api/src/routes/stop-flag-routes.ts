import {
  HttpStatus,
  StopFlagSubpath,
  confirmDoctorSeenResultSchema,
  confirmDoctorSeenSchema,
  reportStopFlagResultSchema,
  reportStopFlagSchema,
} from '@stamina/contracts';
import { Hono } from 'hono';
import { authenticate, requireUserId, type TokenVerifier } from '../auth/index.ts';
import type { Db } from '../db/types.ts';
import { ApiErrorCode } from '../enums/api-error-code.ts';
import type { AppEnv } from '../request-log.ts';
import { StopFlagIdTakenError, confirmDoctorSeen, reportStopFlag } from '../stop-flags/index.ts';

/**
 * Stop flags: `POST /safety/stop-flags` (one reported flag: `200` `Saved` with where the person
 * stands now, `409` when the id belongs to someone else) and `POST /safety/stop-flags/confirm`
 * ("a doctor has seen me": ends the open pauses of the kinds in the `flags` body). A repeated id
 * is replay-safe, so a client may resend until it hears back. Bodies are health data: never
 * logged, and an invalid body is never echoed.
 */
export function stopFlagRoutes({ db, auth }: { db: Db; auth: TokenVerifier }) {
  const routes = new Hono<AppEnv>();

  routes.post('/', authenticate(auth), async (c) => {
    const body = reportStopFlagSchema.safeParse(await c.req.json().catch(() => undefined));
    if (!body.success) {
      return c.json({ error: ApiErrorCode.InvalidRequest }, HttpStatus.BadRequest);
    }

    try {
      const result = await reportStopFlag(db, requireUserId(c), body.data);
      return c.json(reportStopFlagResultSchema.parse(result));
    } catch (error) {
      if (error instanceof StopFlagIdTakenError) {
        return c.json({ error: ApiErrorCode.IdTaken }, HttpStatus.Conflict);
      }
      throw error;
    }
  });

  routes.post(`/${StopFlagSubpath.Confirm}`, authenticate(auth), async (c) => {
    const body = confirmDoctorSeenSchema.safeParse(await c.req.json().catch(() => undefined));
    if (!body.success) {
      return c.json({ error: ApiErrorCode.InvalidRequest }, HttpStatus.BadRequest);
    }
    const result = await confirmDoctorSeen(db, requireUserId(c), body.data);
    return c.json(confirmDoctorSeenResultSchema.parse(result));
  });

  return routes;
}
