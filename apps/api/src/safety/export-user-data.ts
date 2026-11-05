import { userExportSchema, type UserExport } from '@stamina/contracts';
import { asc, eq } from 'drizzle-orm';
import type { FieldCipher } from '../crypto/index.ts';
import { consent, profile, screening, sport, sportRequest } from '../db/schema.ts';
import type { Db } from '../db/types.ts';
import { withUser } from '../db/with-user.ts';
import { readProgram } from '../program/index.ts';
import { toSavedProfile } from '../profile/to-saved-profile.ts';
import { storedAnswersSchema } from './stored-answers-schema.ts';
import { toSavedScreening } from './to-saved-screening.ts';

/**
 * Everything held about the user: profile, every consent row, the Program week, every sport they asked for and every Screening with its
 * answers decrypted, oldest first. The one place answers leave the server.
 */
export async function exportUserData(
  db: Db,
  cipher: FieldCipher,
  userId: string,
): Promise<UserExport> {
  const { profileRow, consentRows, screeningRows, programWeek } = await withUser(
    db,
    userId,
    async (tx) => ({
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
      programWeek: await readProgram(tx, userId),
    }),
  );

  // As the table owner, filtered by the user: a rejected sport is hidden from its requesters by
  // the `sport_visible` policy, but the request is still the user's data and is exported.
  const sportRequestRows = await db
    .select({
      sportId: sportRequest.sportId,
      name: sport.name,
      requestedAt: sportRequest.createdAt,
    })
    .from(sportRequest)
    .innerJoin(sport, eq(sport.id, sportRequest.sportId))
    .where(eq(sportRequest.userId, userId))
    .orderBy(asc(sportRequest.createdAt));

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
    program: programWeek,
    sportRequests: sportRequestRows.map((row) => ({
      sportId: row.sportId,
      name: row.name,
      requestedAt: row.requestedAt.toISOString(),
    })),
    screenings,
  });
}
