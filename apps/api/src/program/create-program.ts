import {
  ProgramRejection,
  RecordStatus,
  SportKind,
  type CreateProgramResult,
} from '@stamina/contracts';
import {
  addDays,
  ConsentPurpose,
  DEFAULT_EQUIPMENT,
  generateWeek,
  TrainingMode,
  type GenerateWeekInput,
} from '@stamina/domain';
import { eq, sql } from 'drizzle-orm';
import { lockUser } from '../db/lock-user.ts';
import { exercise, profile } from '../db/schema.ts';
import type { Db } from '../db/types.ts';
import { withUser } from '../db/with-user.ts';
import { toExercise } from '../exercises/to-exercise.ts';
import { toSavedProfile } from '../profile/to-saved-profile.ts';
import { readGrantedPurposes } from '../safety/read-granted-purposes.ts';
import { readLatestScreening } from '../safety/read-latest-screening.ts';
import { toSavedScreening } from '../safety/to-saved-screening.ts';
import { FIRST_WEEK_IN_BLOCK, START_DELAY_DAYS } from './config.ts';
import { findProfileSport } from './find-profile-sport.ts';
import { hashInputs } from './hash-inputs.ts';
import { readProgram } from './read-program.ts';
import { storeWeek } from './store-week.ts';

const rejected = (reason: ProgramRejection): CreateProgramResult => ({
  status: RecordStatus.Rejected,
  reason,
});

/**
 * Creates the signed-in user's Program (week 1 of Block 1, by rules only) or says why not. One
 * Program per user: when it exists it is returned unchanged, and `lockUser` makes two
 * simultaneous calls run one after the other. The week starts the day after `now`, in UTC.
 * Refusals, in order: no saved profile, missing consent or no Screening (`NotReady`); a Referred
 * Training mode (`Referred`); food only (`NoTrainingWeek`); a library that cannot fill every slot
 * of every Session for the person's equipment and excluded areas (`NoExercises`). Nothing is
 * stored for a refusal.
 */
export async function createProgram(
  db: Db,
  userId: string,
  now: () => Date,
): Promise<CreateProgramResult> {
  return withUser(db, userId, async (tx): Promise<CreateProgramResult> => {
    await lockUser(tx, userId);

    const existing = await readProgram(tx, userId);
    if (existing !== null) return { status: RecordStatus.Saved, program: existing };

    const [profileRow] = await tx.select().from(profile).where(eq(profile.userId, userId));
    const screeningRow = await readLatestScreening(tx, userId);
    const granted = await readGrantedPurposes(tx, userId);
    const consented = Object.values(ConsentPurpose).every((purpose) => granted.includes(purpose));
    if (profileRow === undefined || screeningRow === undefined || !consented) {
      return rejected(ProgramRejection.NotReady);
    }

    const screening = toSavedScreening(screeningRow);
    if (screening.trainingMode === TrainingMode.Referred) {
      return rejected(ProgramRejection.Referred);
    }
    const saved = toSavedProfile(profileRow);
    if (saved.trainingWeek === undefined) return rejected(ProgramRejection.NoTrainingWeek);

    const library = (
      await tx
        .select()
        .from(exercise)
        .orderBy(sql`${exercise.id} collate "C"`)
    ).map(toExercise);
    const input: GenerateWeekInput = {
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
      startsOn: addDays(now().toISOString().slice(0, 10), START_DELAY_DAYS),
    };

    const week = generateWeek(input);
    if (week === null) return rejected(ProgramRejection.NoExercises);

    await storeWeek(tx, userId, week, {
      inputsHash: await hashInputs(input),
      beta: saved.sport.kind === SportKind.Other,
    });
    const stored = await readProgram(tx, userId);
    if (stored === null) throw new Error('the Program just stored cannot be read back');
    return { status: RecordStatus.Saved, program: stored };
  });
}
