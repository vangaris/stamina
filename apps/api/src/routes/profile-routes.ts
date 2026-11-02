import {
  HttpStatus,
  SaveProfileStatus,
  getProfileResponseSchema,
  profileSubmissionSchema,
  saveProfileResultSchema,
} from '@stamina/contracts';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { authenticate, requireUserId, type TokenVerifier } from '../auth/index.ts';
import type { Db } from '../db/client.ts';
import { profile } from '../db/schema.ts';
import { withUser } from '../db/with-user.ts';
import { ApiErrorCode } from '../enums/api-error-code.ts';
import { saveProfile } from '../profile/save-profile.ts';
import { toSavedProfile } from '../profile/to-saved-profile.ts';
import type { AppEnv } from '../request-log.ts';

/**
 * `GET /profile` and `POST /profile` for the signed-in user. The body is health-adjacent: it is
 * never logged, and a rejected body is never echoed.
 */
export function profileRoutes({ db, auth }: { db: Db; auth: TokenVerifier }) {
  const routes = new Hono<AppEnv>();

  routes.get('/', authenticate(auth), async (c) => {
    const userId = requireUserId(c);
    const [row] = await withUser(db, userId, (tx) =>
      tx.select().from(profile).where(eq(profile.userId, userId)),
    );
    return c.json(getProfileResponseSchema.parse({ profile: row ? toSavedProfile(row) : null }));
  });

  routes.post('/', authenticate(auth), async (c) => {
    const userId = requireUserId(c);
    const body = profileSubmissionSchema.safeParse(await c.req.json().catch(() => undefined));
    if (!body.success) return c.json({ error: ApiErrorCode.InvalidRequest }, HttpStatus.BadRequest);

    const result = saveProfileResultSchema.parse(await saveProfile(db, userId, body.data));
    return c.json(
      result,
      result.status === SaveProfileStatus.Saved ? HttpStatus.Ok : HttpStatus.UnprocessableEntity,
    );
  });

  return routes;
}
