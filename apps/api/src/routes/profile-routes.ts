import {
  ProfileRejection,
  SaveProfileStatus,
  getProfileResponseSchema,
  profileSubmissionSchema,
  saveProfileResultSchema,
} from '@stamina/contracts';
import { Eligibility, checkEligibility, normalizeInviteCode } from '@stamina/domain';
import { eq, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { authenticate, requireUserId, type TokenVerifier } from '../auth/index.ts';
import type { Db } from '../db/client.ts';
import { appUser, profile } from '../db/schema.ts';
import { withUser } from '../db/with-user.ts';
import { ApiErrorCode } from '../enums/api-error-code.ts';
import { redeemInvite } from '../invites/redeem-invite.ts';
import type { AppEnv } from '../request-log.ts';
import { toProfileValues, toSavedProfile } from '../profile/profile-mapping.ts';

const HTTP_UNPROCESSABLE = 422;

const REJECTION_FOR: Record<Exclude<Eligibility, Eligibility.Eligible>, ProfileRejection> = {
  [Eligibility.UnderAge]: ProfileRejection.UnderAge,
  [Eligibility.OutsideEea]: ProfileRejection.OutsideEea,
};

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
    if (!body.success) return c.json({ error: ApiErrorCode.InvalidRequest }, 400);
    const { inviteCode, ...answers } = body.data;

    // The same rule the web app applies locally. It runs before any table is touched, so a
    // minor or a non-EEA resident leaves nothing behind and keeps their invite.
    const eligibility = checkEligibility({
      birthYear: answers.birthYear,
      country: answers.country,
      currentYear: new Date().getUTCFullYear(),
    });
    if (eligibility !== Eligibility.Eligible) {
      return c.json(
        saveProfileResultSchema.parse({
          status: SaveProfileStatus.Rejected,
          reason: REJECTION_FOR[eligibility],
        }),
        HTTP_UNPROCESSABLE,
      );
    }

    const values = toProfileValues(answers);
    const saved = await withUser(db, userId, async (tx) => {
      // The user row exists after `GET /me`; make sure of it, then lock it so two saves by the
      // same person (two tabs) run one after the other and cannot redeem two invites.
      await tx.insert(appUser).values({ id: userId }).onConflictDoNothing();
      await tx.select({ id: appUser.id }).from(appUser).where(eq(appUser.id, userId)).for('update');

      const [existing] = await tx
        .select({ userId: profile.userId })
        .from(profile)
        .where(eq(profile.userId, userId));
      if (!existing) {
        const code = normalizeInviteCode(inviteCode);
        if (code === undefined || !(await redeemInvite(tx, code, userId))) return undefined;
      }

      const [row] = await tx
        .insert(profile)
        .values({ userId, ...values })
        .onConflictDoUpdate({ target: profile.userId, set: { ...values, updatedAt: sql`now()` } })
        .returning();
      return row;
    });

    if (!saved) {
      return c.json(
        saveProfileResultSchema.parse({
          status: SaveProfileStatus.Rejected,
          reason: ProfileRejection.InviteInvalid,
        }),
        HTTP_UNPROCESSABLE,
      );
    }
    return c.json(
      saveProfileResultSchema.parse({
        status: SaveProfileStatus.Saved,
        profile: toSavedProfile(saved),
      }),
    );
  });

  return routes;
}
