import { RULES_VERSION, SessionStatus, type GeneratedWeek } from '@stamina/domain';
import { block, program, session, sessionExercise } from '../db/schema.ts';
import type { UserTx } from '../db/types.ts';
import { FIRST_BLOCK_POSITION, FIRST_REVISION } from './config.ts';

/** What a stored week records besides the generated Sessions. */
export interface StoreWeekOptions {
  inputsHash: string;
  /** The person's sport is a requested one that is not approved yet. */
  beta: boolean;
}

/**
 * Inserts the user's Program with its first Block, the week's Sessions and their exercises.
 * `model` and `prompt_version` stay null: no AI picked anything. The unique index on the user
 * makes a second Program fail, so the caller holds `lockUser` and reads first.
 */
export async function storeWeek(
  tx: UserTx,
  userId: string,
  week: GeneratedWeek,
  { inputsHash, beta }: StoreWeekOptions,
): Promise<void> {
  const [programRow] = await tx.insert(program).values({ userId }).returning({ id: program.id });
  const [blockRow] = await tx
    .insert(block)
    .values({
      userId,
      programId: programRow!.id,
      position: FIRST_BLOCK_POSITION,
      emphasis: week.emphasis,
      startsOn: week.startsOn,
    })
    .returning({ id: block.id });

  const sessionIds = week.sessions.map(() => crypto.randomUUID());
  await tx.insert(session).values(
    week.sessions.map((planned, index) => ({
      id: sessionIds[index]!,
      userId,
      blockId: blockRow!.id,
      weekInBlock: week.weekInBlock,
      date: planned.date,
      weekday: planned.weekday,
      focus: planned.focus,
      minutes: planned.minutes,
      status: SessionStatus.Planned,
      limited: week.limited,
      beta,
      revision: FIRST_REVISION,
      supersedesId: null,
      rulesVersion: RULES_VERSION,
      model: null,
      promptVersion: null,
      inputsHash,
    })),
  );
  await tx.insert(sessionExercise).values(
    week.sessions.flatMap((planned, index) =>
      planned.exercises.map((exercise, position) => ({
        userId,
        sessionId: sessionIds[index]!,
        position,
        exerciseId: exercise.exerciseId,
        slot: exercise.slot,
        sets: exercise.sets,
        repMin: exercise.repMin,
        repMax: exercise.repMax,
        unit: exercise.unit,
        rir: exercise.rir,
        loadGuidance: exercise.loadGuidance,
      })),
    ),
  );
}
