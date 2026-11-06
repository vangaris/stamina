import {
  HttpStatus,
  RecordStatus,
  SessionSubpath,
  finishSessionResultSchema,
  finishSessionSchema,
  logSetResultSchema,
  logSetSchema,
  sessionResponseSchema,
} from '@stamina/contracts';
import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { authenticate, requireUserId, type TokenVerifier } from '../auth/index.ts';
import type { Db } from '../db/types.ts';
import { withUser } from '../db/with-user.ts';
import { ApiErrorCode } from '../enums/api-error-code.ts';
import type { AppEnv } from '../request-log.ts';
import { finishSession, logSet, readSession } from '../sessions/index.ts';

const notFound = (c: Context<AppEnv>) =>
  c.json({ error: ApiErrorCode.NotFound }, HttpStatus.NotFound);
const invalidRequest = (c: Context<AppEnv>) =>
  c.json({ error: ApiErrorCode.InvalidRequest }, HttpStatus.BadRequest);

/**
 * One Session: `GET /sessions/{id}` (the Session with what is logged, `404` when it is not the
 * signed-in user's or the id is not a UUID), `POST /sessions/{id}/sets` (one set: `200` `Saved`,
 * `422` `Rejected`) and `POST /sessions/{id}/finish` (`200` with the stored finish). Sets and
 * finishes are replay-safe, so a client may resend them until it hears back. Bodies are
 * health-adjacent: never logged, and a rejected body is never echoed.
 */
export function sessionRoutes({ db, auth }: { db: Db; auth: TokenVerifier }) {
  const routes = new Hono<AppEnv>();

  routes.get('/:id', authenticate(auth), async (c) => {
    const sessionId = c.req.param('id');
    if (!z.uuid().safeParse(sessionId).success) return notFound(c);
    const userId = requireUserId(c);
    const found = await withUser(db, userId, (tx) => readSession(tx, userId, sessionId));
    return found === null ? notFound(c) : c.json(sessionResponseSchema.parse({ session: found }));
  });

  routes.post(`/:id/${SessionSubpath.Sets}`, authenticate(auth), async (c) => {
    const sessionId = c.req.param('id');
    if (!z.uuid().safeParse(sessionId).success) return notFound(c);
    const body = logSetSchema.safeParse(await c.req.json().catch(() => undefined));
    if (!body.success) return invalidRequest(c);

    const result = await logSet(db, requireUserId(c), sessionId, body.data);
    if (result === null) return notFound(c);
    return c.json(
      logSetResultSchema.parse(result),
      result.status === RecordStatus.Saved ? HttpStatus.Ok : HttpStatus.UnprocessableEntity,
    );
  });

  routes.post(`/:id/${SessionSubpath.Finish}`, authenticate(auth), async (c) => {
    const sessionId = c.req.param('id');
    if (!z.uuid().safeParse(sessionId).success) return notFound(c);
    const body = finishSessionSchema.safeParse(await c.req.json().catch(() => undefined));
    if (!body.success) return invalidRequest(c);

    const result = await finishSession(db, requireUserId(c), sessionId, body.data);
    return result === null ? notFound(c) : c.json(finishSessionResultSchema.parse(result));
  });

  return routes;
}
