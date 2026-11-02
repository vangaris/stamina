import { HttpStatus, consentGrantSchema, consentStateSchema } from '@stamina/contracts';
import { Hono } from 'hono';
import { authenticate, requireUserId, type TokenVerifier } from '../auth/index.ts';
import type { Db } from '../db/types.ts';
import { ApiErrorCode } from '../enums/api-error-code.ts';
import type { AppEnv } from '../request-log.ts';
import { grantConsent } from '../safety/grant-consent.ts';

/** `POST /consent`: records one consent. A rejected body is never echoed. */
export function consentRoutes({ db, auth }: { db: Db; auth: TokenVerifier }) {
  const routes = new Hono<AppEnv>();
  routes.post('/', authenticate(auth), async (c) => {
    const userId = requireUserId(c);
    const body = consentGrantSchema.safeParse(await c.req.json().catch(() => undefined));
    if (!body.success) return c.json({ error: ApiErrorCode.InvalidRequest }, HttpStatus.BadRequest);

    return c.json(consentStateSchema.parse(await grantConsent(db, userId, body.data)));
  });
  return routes;
}
