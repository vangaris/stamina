import { userExportSchema, type UserExport } from '@stamina/contracts';
import { asc, eq } from 'drizzle-orm';
import type { FieldCipher } from '../crypto/index.ts';
import {
  activity,
  checkin,
  consent,
  profile,
  screening,
  sessionLog,
  setLog,
  sport,
  sportRequest,
  stopFlag,
  waterLog,
  weighIn,
} from '../db/schema.ts';
import type { Db } from '../db/types.ts';
import { withUser } from '../db/with-user.ts';
import { toLoggedActivity } from '../activities/index.ts';
import { readAdaptationRows, toExportedAdaptation } from '../adaptations/index.ts';
import { toCheckin } from '../checkins/index.ts';
import { readProgram } from '../program/index.ts';
import { toFinishedSession } from '../sessions/index.ts';
import { toNutritionSetup } from '../nutrition/index.ts';
import { toSavedProfile } from '../profile/to-saved-profile.ts';
import { storedAnswersSchema } from './stored-answers-schema.ts';
import { toSavedScreening } from './to-saved-screening.ts';

/**
 * Everything held about the user: profile, every consent row, the Program week, every logged set, finished Session, Activity, Check-in, Adaptation (with its decision), stop flag, weigh-in and water log, the Unlock Meals setup, every sport they asked for and every Screening with its
 * answers decrypted, oldest first. The one place answers leave the server.
 */
export async function exportUserData(
  db: Db,
  cipher: FieldCipher,
  userId: string,
): Promise<UserExport> {
  const {
    profileRow,
    consentRows,
    screeningRows,
    programWeek,
    setRows,
    finishRows,
    activityRows,
    checkinRows,
    adaptationRows,
    stopFlagRows,
    weighInRows,
    waterRows,
  } = await withUser(db, userId, async (tx) => ({
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
    setRows: await tx
      .select()
      .from(setLog)
      .where(eq(setLog.userId, userId))
      .orderBy(asc(setLog.createdAt), asc(setLog.setNumber)),
    finishRows: await tx
      .select()
      .from(sessionLog)
      .where(eq(sessionLog.userId, userId))
      .orderBy(asc(sessionLog.finishedAt)),
    activityRows: await tx
      .select()
      .from(activity)
      .where(eq(activity.userId, userId))
      .orderBy(asc(activity.loggedAt)),
    checkinRows: await tx
      .select()
      .from(checkin)
      .where(eq(checkin.userId, userId))
      .orderBy(asc(checkin.submittedAt)),
    adaptationRows: await readAdaptationRows(tx, userId),
    stopFlagRows: await tx
      .select()
      .from(stopFlag)
      .where(eq(stopFlag.userId, userId))
      .orderBy(asc(stopFlag.reportedAt)),
    weighInRows: await tx
      .select()
      .from(weighIn)
      .where(eq(weighIn.userId, userId))
      .orderBy(asc(weighIn.createdAt)),
    waterRows: await tx
      .select()
      .from(waterLog)
      .where(eq(waterLog.userId, userId))
      .orderBy(asc(waterLog.createdAt)),
  }));

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
    setLogs: setRows.map((row) => ({
      id: row.id,
      sessionId: row.sessionId,
      exerciseId: row.exerciseId,
      setNumber: row.setNumber,
      weightKg: row.weightKg,
      reps: row.reps,
      rpe: row.rpe,
      loggedAt: row.createdAt.toISOString(),
    })),
    sessionLogs: finishRows.map((row) => ({
      ...toFinishedSession(row),
      sessionId: row.sessionId,
    })),
    activities: activityRows.map(toLoggedActivity),
    checkins: checkinRows.map(toCheckin),
    adaptations: adaptationRows.map(toExportedAdaptation),
    stopFlags: stopFlagRows.map((row) => ({
      id: row.id,
      flag: row.flag,
      date: row.date,
      area: row.bodyArea,
      sessionId: row.sessionId,
      reportedAt: row.reportedAt.toISOString(),
      confirmedAt: row.confirmedAt?.toISOString() ?? null,
    })),
    weighIns: weighInRows.map((row) => ({
      id: row.id,
      date: row.date,
      weightKg: row.weightKg,
      loggedAt: row.createdAt.toISOString(),
    })),
    nutritionSetup: profileRow ? toNutritionSetup(profileRow, true) : null,
    waterLogs: waterRows.map((row) => ({
      id: row.id,
      date: row.date,
      ml: row.ml,
      loggedAt: row.createdAt.toISOString(),
    })),
    sportRequests: sportRequestRows.map((row) => ({
      sportId: row.sportId,
      name: row.name,
      requestedAt: row.requestedAt.toISOString(),
    })),
    screenings,
  });
}
