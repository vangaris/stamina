import { inviteCheckRequestSchema, inviteCheckResponseSchema } from '@stamina/contracts';
import { normalizeInviteCode } from '@stamina/domain';
import { and, eq, isNull } from 'drizzle-orm';
import { Hono } from 'hono';
import type { Db } from '../db/client.ts';
import { invite } from '../db/schema.ts';
import { ApiErrorCode } from '../enums/api-error-code.ts';
import type { AppEnv } from '../request-log.ts';

/**
 * `POST /invites/check` (no sign-in): is this a code someone can still use? Runs on the
 * connection role, not as a user, because nobody is signed in yet. Malformed, unknown and used
 * codes all answer `{ valid: false }`.
 */
export function inviteRoutes({ db }: { db: Db }) {
  const routes = new Hono<AppEnv>();
  routes.post('/', async (c) => {
    const body = inviteCheckRequestSchema.safeParse(await c.req.json().catch(() => undefined));
    if (!body.success) return c.json({ error: ApiErrorCode.InvalidRequest }, 400);

    const code = normalizeInviteCode(body.data.code);
    const open =
      code !== undefined &&
      (
        await db
          .select({ code: invite.code })
          .from(invite)
          .where(and(eq(invite.code, code), isNull(invite.redeemedBy)))
          .limit(1)
      ).length === 1;
    return c.json(inviteCheckResponseSchema.parse({ valid: open }));
  });
  return routes;
}
