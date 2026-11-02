import {
  HttpStatus,
  inviteCheckRequestSchema,
  inviteCheckResponseSchema,
} from '@stamina/contracts';
import { Hono } from 'hono';
import type { Db } from '../db/types.ts';
import { ApiErrorCode } from '../enums/api-error-code.ts';
import { isInviteOpen } from '../invites/is-invite-open.ts';
import type { AppEnv } from '../request-log.ts';

/**
 * `POST /invites/check` (no sign-in): is this a code someone can still use? Malformed, unknown
 * and used codes all answer `{ valid: false }`; a body that is not `{ code: string }` within the
 * input length bound answers 400.
 */
export function inviteRoutes({ db }: { db: Db }) {
  const routes = new Hono<AppEnv>();
  routes.post('/', async (c) => {
    const body = inviteCheckRequestSchema.safeParse(await c.req.json().catch(() => undefined));
    if (!body.success) return c.json({ error: ApiErrorCode.InvalidRequest }, HttpStatus.BadRequest);
    return c.json(
      inviteCheckResponseSchema.parse({ valid: await isInviteOpen(db, body.data.code) }),
    );
  });
  return routes;
}
