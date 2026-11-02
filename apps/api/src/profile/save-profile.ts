import {
  ProfileRejection,
  SaveProfileStatus,
  profileRejectionFor,
  type ProfileSubmission,
  type SaveProfileResult,
} from '@stamina/contracts';
import { checkEligibility, isGoalAvailable, normalizeInviteCode } from '@stamina/domain';
import { eq, sql } from 'drizzle-orm';
import { lockUser } from '../db/lock-user.ts';
import type { Db } from '../db/types.ts';
import { profile } from '../db/schema.ts';
import { withUser } from '../db/with-user.ts';
import { redeemInvite } from '../invites/redeem-invite.ts';
import { readLatestScreening } from '../safety/read-latest-screening.ts';
import { toProfileValues } from './to-profile-values.ts';
import { toSavedProfile } from './to-saved-profile.ts';

const rejected = (reason: ProfileRejection): SaveProfileResult => ({
  status: SaveProfileStatus.Rejected,
  reason,
});

/**
 * Saves the signed-in user's profile, or says why not. Order: eligibility (touches no table, so
 * a minor or non-EEA resident leaves nothing behind and keeps their invite) -> if the user
 * already has a profile, update it without needing or using the invite -> otherwise redeem the
 * invite and insert, in one transaction. An invalid, used or unknown code stores nothing. A Goal
 * that the latest Screening has made unavailable (body composition while Nutrition is off) is
 * turned away before anything is stored or redeemed.
 */
export async function saveProfile(
  db: Db,
  userId: string,
  { inviteCode, ...answers }: ProfileSubmission,
): Promise<SaveProfileResult> {
  const turnedAway = profileRejectionFor(
    checkEligibility({
      birthYear: answers.birthYear,
      country: answers.country,
      // UTC, like the web app, so both sides agree on the year.
      currentYear: new Date().getUTCFullYear(),
    }),
  );
  if (turnedAway !== undefined) return rejected(turnedAway);

  const values = toProfileValues(answers);
  const saved = await withUser(db, userId, async (tx) => {
    // The user row exists after `GET /me`; make sure of it, then lock it so two saves by the
    // same person (two tabs) run one after the other and cannot redeem two invites.
    await lockUser(tx, userId);

    const latestScreening = await readLatestScreening(tx, userId);
    if (latestScreening && !isGoalAvailable(answers.goal, latestScreening)) {
      return ProfileRejection.GoalUnavailable;
    }

    const [existing] = await tx
      .select({ userId: profile.userId })
      .from(profile)
      .where(eq(profile.userId, userId));
    if (!existing) {
      const code = normalizeInviteCode(inviteCode);
      if (code === undefined || !(await redeemInvite(tx, code, userId))) {
        return ProfileRejection.InviteInvalid;
      }
    }

    const [row] = await tx
      .insert(profile)
      .values({ userId, ...values })
      .onConflictDoUpdate({ target: profile.userId, set: { ...values, updatedAt: sql`now()` } })
      .returning();
    return row!;
  });

  if (typeof saved === 'string') return rejected(saved);
  return { status: SaveProfileStatus.Saved, profile: toSavedProfile(saved) };
}
