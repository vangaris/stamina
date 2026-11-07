import {
  DAYS_IN_WEEK,
  RULES_VERSION,
  SessionStatus,
  addDays,
  type AppliedAdaptation,
  type GenerationBasis,
} from '@stamina/domain';
import { asc, desc, eq, inArray } from 'drizzle-orm';
import { block, program, session, sessionExercise } from '../db/schema.ts';
import type { UserTx } from '../db/types.ts';
import { FIRST_REVISION, hashInputs } from '../program/index.ts';

/**
 * Stores a repeated week or restarted Block: a new Block (the next position) whose `starts_on` is
 * the new week's first day minus `(weekInBlock - 1) * 7` days, so the week's days still come from
 * the Block's start, and the freshly generated Sessions. Each takes the place of one of the
 * unfinished Sessions it replaces (both in date order): `supersedes_id` points at it and the
 * revision is one above, so those rows stop being current. `generation` and `rirBoost` are what
 * the week was generated from; the Sessions record their hash. The AI picked nothing, so `model`
 * and `prompt_version` are null. The caller holds `lockUser` and has checked that nothing was done
 * in the replaced Sessions.
 */
export async function startBlockWeek(
  tx: UserTx,
  userId: string,
  applied: AppliedAdaptation,
  generation: GenerationBasis,
  rirBoost: number,
): Promise<void> {
  const week = applied.block;
  if (week === null) throw new Error('a new Block comes with a repeated week or a restarted Block');

  const [programRow] = await tx
    .select({ id: program.id })
    .from(program)
    .where(eq(program.userId, userId));
  const [latest] = await tx
    .select({ position: block.position })
    .from(block)
    .where(eq(block.programId, programRow!.id))
    .orderBy(desc(block.position))
    .limit(1);
  const replaced = await tx
    .select()
    .from(session)
    .where(inArray(session.id, applied.supersedes))
    .orderBy(asc(session.date), asc(session.id));

  const [blockRow] = await tx
    .insert(block)
    .values({
      userId,
      programId: programRow!.id,
      position: latest!.position + 1,
      emphasis: week.emphasis,
      startsOn: addDays(week.startsOn, -(week.weekInBlock - 1) * DAYS_IN_WEEK),
    })
    .returning({ id: block.id });

  const inputsHash = await hashInputs({
    ...generation,
    weekInBlock: week.weekInBlock,
    startsOn: week.startsOn,
    rirBoost,
  });
  const ids = applied.sessions.map(() => crypto.randomUUID());
  await tx.insert(session).values(
    applied.sessions.map((planned, index) => ({
      id: ids[index]!,
      userId,
      blockId: blockRow!.id,
      weekInBlock: week.weekInBlock,
      date: planned.date,
      weekday: planned.weekday,
      focus: planned.focus,
      minutes: planned.minutes,
      status: SessionStatus.Planned,
      limited: week.limited,
      beta: replaced[0]?.beta ?? false,
      revision: replaced[index] === undefined ? FIRST_REVISION : replaced[index].revision + 1,
      supersedesId: replaced[index]?.id ?? null,
      rulesVersion: RULES_VERSION,
      model: null,
      promptVersion: null,
      inputsHash,
    })),
  );
  await tx.insert(sessionExercise).values(
    applied.sessions.flatMap((planned, index) =>
      planned.exercises.map((exercise, position) => ({
        userId,
        sessionId: ids[index]!,
        position,
        exerciseId: exercise.exerciseId,
        slot: exercise.slot,
        sets: exercise.sets,
        repMin: exercise.repMin,
        repMax: exercise.repMax,
        unit: exercise.unit,
        rir: exercise.rir,
        loadGuidance: exercise.loadGuidance,
        pickReason: null,
      })),
    ),
  );
}
