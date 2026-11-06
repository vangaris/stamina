import { safetyStateSchema } from '@stamina/contracts';
import { Hono } from 'hono';
import { authenticate, requireUserId, type TokenVerifier } from '../auth/index.ts';
import type { Db } from '../db/types.ts';
import { eq } from 'drizzle-orm';
import { profile } from '../db/schema.ts';
import { withUser } from '../db/with-user.ts';
import type { AppEnv } from '../request-log.ts';
import { readStopState } from '../stop-flags/index.ts';
import { readGrantedPurposes } from '../safety/read-granted-purposes.ts';
import { readLatestScreening } from '../safety/read-latest-screening.ts';
import { toSavedScreening } from '../safety/to-saved-screening.ts';

/**
 * `GET /safety`: the consents in force, the latest Screening's outcome (never its answers) and
 * what the reported stop flags add up to (pauses, the rest day, excluded areas).
 */
export function safetyRoutes({ db, auth }: { db: Db; auth: TokenVerifier }) {
  const routes = new Hono<AppEnv>();
  routes.get('/', authenticate(auth), async (c) => {
    const userId = requireUserId(c);
    const state = await withUser(db, userId, async (tx) => {
      const latest = await readLatestScreening(tx, userId);
      return {
        profileSaved:
          (await tx.select({ id: profile.userId }).from(profile).where(eq(profile.userId, userId)))
            .length > 0,
        granted: await readGrantedPurposes(tx, userId),
        screening: latest ? toSavedScreening(latest) : null,
        stop: await readStopState(tx, userId),
      };
    });
    return c.json(safetyStateSchema.parse(state));
  });
  return routes;
}
