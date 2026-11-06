import { ProgramRejection, SportKind } from '@stamina/contracts';
import { addDays, ConsentPurpose, DEFAULT_EQUIPMENT, TrainingMode } from '@stamina/domain';
import { eq, sql } from 'drizzle-orm';
import { exercise, profile } from '../db/schema.ts';
import type { UserTx } from '../db/types.ts';
import { toExercise } from '../exercises/to-exercise.ts';
import { toSavedProfile } from '../profile/to-saved-profile.ts';
import { readGrantedPurposes } from '../safety/read-granted-purposes.ts';
import { readLatestScreening } from '../safety/read-latest-screening.ts';
import { toSavedScreening } from '../safety/to-saved-screening.ts';
import { FIRST_WEEK_IN_BLOCK, START_DELAY_DAYS } from './config.ts';
import { ProgramInputsStatus } from './enums/program-inputs-status.ts';
import type { ProgramInputs } from './types.ts';
import { findProfileSport } from './find-profile-sport.ts';

const refused = (reason: ProgramRejection): ProgramInputs => ({
  status: ProgramInputsStatus.Refused,
  reason,
});

/**
 * Everything the engine reads for the signed-in user's first week, or why it cannot run.
 * Refusals, in order: no saved profile, missing consent or no Screening (`NotReady`); a Referred
 * Training mode (`Referred`); food only (`NoTrainingWeek`). The week starts the day after
 * `now`, in UTC. Reads as the app role, so what the person may see is what the engine sees.
 */
export async function readProgramInputs(
  tx: UserTx,
  userId: string,
  now: Date,
): Promise<ProgramInputs> {
  const [profileRow] = await tx.select().from(profile).where(eq(profile.userId, userId));
  const screeningRow = await readLatestScreening(tx, userId);
  const granted = await readGrantedPurposes(tx, userId);
  const consented = Object.values(ConsentPurpose).every((purpose) => granted.includes(purpose));
  if (profileRow === undefined || screeningRow === undefined || !consented) {
    return refused(ProgramRejection.NotReady);
  }

  const screening = toSavedScreening(screeningRow);
  if (screening.trainingMode === TrainingMode.Referred) return refused(ProgramRejection.Referred);
  const saved = toSavedProfile(profileRow);
  if (saved.trainingWeek === undefined) return refused(ProgramRejection.NoTrainingWeek);

  const library = (
    await tx
      .select()
      .from(exercise)
      .orderBy(sql`${exercise.id} collate "C"`)
  ).map(toExercise);
  return {
    status: ProgramInputsStatus.Ready,
    beta: saved.sport.kind === SportKind.Other,
    sport: saved.sport.kind === SportKind.Launch ? saved.sport.sport : null,
    input: {
      goal: saved.goal,
      playDays: saved.playDays,
      playVaries: saved.playVaries,
      playIntensity: saved.playIntensity,
      trainingWeek: saved.trainingWeek,
      sport: await findProfileSport(tx, saved),
      mode: screening.trainingMode,
      excludedAreas: screening.excludedAreas,
      equipment: DEFAULT_EQUIPMENT,
      library,
      weekInBlock: FIRST_WEEK_IN_BLOCK,
      startsOn: addDays(now.toISOString().slice(0, 10), START_DELAY_DAYS),
    },
  };
}
