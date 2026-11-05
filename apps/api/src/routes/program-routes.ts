import {
  HttpStatus,
  RecordStatus,
  createProgramResultSchema,
  programResponseSchema,
} from '@stamina/contracts';
import { Hono } from 'hono';
import { authenticate, requireUserId, type TokenVerifier } from '../auth/index.ts';
import type { Db } from '../db/types.ts';
import { withUser } from '../db/with-user.ts';
import { createProgram, readProgram } from '../program/index.ts';
import type { AppEnv } from '../request-log.ts';

/**
 * `GET /program` (the signed-in user's week, or `null` before there is one) and `POST /program`
 * (creates it once, `200` with the week, or `422` with the reason; a repeat returns the stored
 * week). The body is empty: every input comes from the person's saved profile and Screening.
 */
export function programRoutes({ db, auth, now }: { db: Db; auth: TokenVerifier; now: () => Date }) {
  const routes = new Hono<AppEnv>();

  routes.get('/', authenticate(auth), async (c) => {
    const userId = requireUserId(c);
    const program = await withUser(db, userId, (tx) => readProgram(tx, userId));
    return c.json(programResponseSchema.parse({ program }));
  });

  routes.post('/', authenticate(auth), async (c) => {
    const result = createProgramResultSchema.parse(await createProgram(db, requireUserId(c), now));
    return c.json(
      result,
      result.status === RecordStatus.Saved ? HttpStatus.Ok : HttpStatus.UnprocessableEntity,
    );
  });

  return routes;
}
