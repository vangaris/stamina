import { RULES_VERSION, SessionStatus, type RevisedSession } from '@stamina/domain';
import { asc, inArray } from 'drizzle-orm';
import { session, sessionExercise } from '../db/schema.ts';
import type { UserTx } from '../db/types.ts';

/**
 * Stores each revision as a new row of the Session it replaces, in the same Block: `revision` one
 * above the old one (and above any revision already dated the new day in that Block, which the
 * unique index on Block, day and revision needs), `supersedes_id` the old row, the old row and
 * its exercises left as they are. Reproducibility columns come along: `inputs_hash`, `limited`
 * and `beta` are copied, `rules_version` is the engine's now, and `model` and `prompt_version`
 * stay only while the exercise ids are the ones the AI picked. An exercise that stays keeps its
 * `pick_reason`. Every revision must name the Session it replaces. The caller holds `lockUser`
 * and has checked that nothing was done in those Sessions.
 */
export async function reviseSessions(
  tx: UserTx,
  userId: string,
  revisions: readonly RevisedSession[],
): Promise<void> {
  if (revisions.length === 0) return;
  const replacedIds = revisions.map(({ supersedes }) => supersedes!);
  const replaced = await tx.select().from(session).where(inArray(session.id, replacedIds));
  const replacedExercises = await tx
    .select()
    .from(sessionExercise)
    .where(inArray(sessionExercise.sessionId, replacedIds))
    .orderBy(asc(sessionExercise.position));
  const taken = await tx
    .select({ blockId: session.blockId, date: session.date, revision: session.revision })
    .from(session)
    .where(inArray(session.blockId, [...new Set(replaced.map(({ blockId }) => blockId))]));

  const stored = revisions.map((revision) => {
    const old = replaced.find(({ id }) => id === revision.supersedes);
    if (old === undefined) throw new Error('a revision replaces a Session of the user');
    const oldExercises = replacedExercises.filter(({ sessionId }) => sessionId === old.id);
    const sameExercises =
      oldExercises.length === revision.exercises.length &&
      oldExercises.every(
        ({ exerciseId }, index) => exerciseId === revision.exercises[index]!.exerciseId,
      );
    const number =
      Math.max(
        old.revision,
        ...taken
          .filter(({ blockId, date }) => blockId === old.blockId && date === revision.date)
          .map((row) => row.revision),
      ) + 1;
    taken.push({ blockId: old.blockId, date: revision.date, revision: number });
    return { revision, old, oldExercises, sameExercises, number, id: crypto.randomUUID() };
  });

  await tx.insert(session).values(
    stored.map(({ revision, old, sameExercises, number, id }) => ({
      id,
      userId,
      blockId: old.blockId,
      weekInBlock: old.weekInBlock,
      date: revision.date,
      weekday: revision.weekday,
      focus: revision.focus,
      minutes: revision.minutes,
      status: SessionStatus.Planned,
      limited: old.limited,
      beta: old.beta,
      revision: number,
      supersedesId: old.id,
      rulesVersion: RULES_VERSION,
      model: sameExercises ? old.model : null,
      promptVersion: sameExercises ? old.promptVersion : null,
      inputsHash: old.inputsHash,
    })),
  );
  await tx.insert(sessionExercise).values(
    stored.flatMap(({ revision, oldExercises, id }) =>
      revision.exercises.map((exercise, position) => ({
        userId,
        sessionId: id,
        position,
        exerciseId: exercise.exerciseId,
        slot: exercise.slot,
        sets: exercise.sets,
        repMin: exercise.repMin,
        repMax: exercise.repMax,
        unit: exercise.unit,
        rir: exercise.rir,
        loadGuidance: exercise.loadGuidance,
        pickReason:
          oldExercises.find(({ exerciseId }) => exerciseId === exercise.exerciseId)?.pickReason ??
          null,
      })),
    ),
  );
}
