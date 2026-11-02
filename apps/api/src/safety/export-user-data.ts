import { userExportSchema, type UserExport } from '@stamina/contracts';
import { asc, eq } from 'drizzle-orm';
import type { FieldCipher } from '../crypto/index.ts';
import { consent, profile, screening } from '../db/schema.ts';
import type { Db } from '../db/types.ts';
import { withUser } from '../db/with-user.ts';
import { toSavedProfile } from '../profile/to-saved-profile.ts';
import { storedAnswersSchema } from './stored-answers-schema.ts';
import { toSavedScreening } from './to-saved-screening.ts';

/**
 * Everything held about the user: profile, every consent row and every Screening with its
 * answers decrypted, oldest first. The one place answers leave the server.
 */
export async function exportUserData(
  db: Db,
  cipher: FieldCipher,
  userId: string,
): Promise<UserExport> {
  const { profileRow, consentRows, screeningRows } = await withUser(db, userId, async (tx) => ({
    profileRow: (await tx.select().from(profile).where(eq(profile.userId, userId)))[0],
    consentRows: await tx
      .select()
      .from(consent)
      .where(eq(consent.userId, userId))
      .orderBy(asc(consent.grantedAt)),
    screeningRows: await tx
      .select()
      .from(screening)
      .where(eq(screening.userId, userId))
      .orderBy(asc(screening.takenAt)),
  }));

  const screenings = await Promise.all(
    screeningRows.map(async (row) => {
      const { answers } = storedAnswersSchema.parse(
        JSON.parse(await cipher.decrypt(row.answersEncrypted, userId)),
      );
      return { ...toSavedScreening(row), answers };
    }),
  );

  return userExportSchema.parse({
    exportedAt: new Date().toISOString(),
    profile: profileRow ? toSavedProfile(profileRow) : null,
    consents: consentRows.map((row) => ({
      purpose: row.purpose,
      textVersion: row.textVersion,
      locale: row.locale,
      grantedAt: row.grantedAt.toISOString(),
      withdrawnAt: row.withdrawnAt?.toISOString() ?? null,
    })),
    screenings,
  });
}
