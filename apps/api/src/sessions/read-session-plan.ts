import { and, asc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { block, exercise, session, sessionExercise, sessionLog } from '../db/schema.ts';
import type { UserTx } from '../db/types.ts';
import { toFinishedSession } from './to-finished-session.ts';
import type { PlannedExercise, SessionPlan } from './types.ts';

const easier = alias(exercise, 'easier');
const harder = alias(exercise, 'harder');

const toVariant = (
  found: { id: string; nameEn: string; nameEl: string | null } | null,
): PlannedExercise['easier'] =>
  found === null ? null : { exerciseId: found.id, name: { en: found.nameEn, el: found.nameEl } };

/**
 * The user's Session as planned: its Block's Emphasis, its exercises in order with their library
 * names and tagged easier and harder variants, and the finish record if there is one. `null` when
 * the Session is not the user's or does not exist. Row-level security does the isolation; the
 * `user_id` condition says so in the query.
 */
export async function readSessionPlan(
  tx: UserTx,
  userId: string,
  sessionId: string,
): Promise<SessionPlan | null> {
  const [found] = await tx
    .select({ session, emphasis: block.emphasis, finish: sessionLog })
    .from(session)
    .innerJoin(block, eq(block.id, session.blockId))
    .leftJoin(sessionLog, eq(sessionLog.sessionId, session.id))
    .where(and(eq(session.id, sessionId), eq(session.userId, userId)));
  if (found === undefined) return null;

  const rows = await tx
    .select({
      row: sessionExercise,
      nameEn: exercise.nameEn,
      nameEl: exercise.nameEl,
      movementPattern: exercise.movementPattern,
      easier: { id: easier.id, nameEn: easier.nameEn, nameEl: easier.nameEl },
      harder: { id: harder.id, nameEn: harder.nameEn, nameEl: harder.nameEl },
    })
    .from(sessionExercise)
    .innerJoin(exercise, eq(exercise.id, sessionExercise.exerciseId))
    .leftJoin(easier, eq(easier.id, exercise.easierId))
    .leftJoin(harder, eq(harder.id, exercise.harderId))
    .where(eq(sessionExercise.sessionId, sessionId))
    .orderBy(asc(sessionExercise.position));

  return {
    session: found.session,
    emphasis: found.emphasis,
    exercises: rows.map((row) => ({
      row: row.row,
      name: { en: row.nameEn, el: row.nameEl },
      movementPattern: row.movementPattern,
      easier: toVariant(row.easier),
      harder: toVariant(row.harder),
    })),
    finished: found.finish === null ? null : toFinishedSession(found.finish),
  };
}
