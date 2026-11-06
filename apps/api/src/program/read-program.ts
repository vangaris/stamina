import type { ProgramWeek } from '@stamina/contracts';
import { desc, eq, inArray } from 'drizzle-orm';
import {
  block,
  exercise,
  profile,
  program,
  session,
  sessionExercise,
  sessionLog,
} from '../db/schema.ts';
import type { UserTx } from '../db/types.ts';
import { toSavedProfile } from '../profile/to-saved-profile.ts';
import { toProgramWeek } from './to-program-week.ts';

/**
 * The user's latest generated week, or `null` before their Program exists. Reads as the app role,
 * so row-level security keeps it to the user's own rows. The week's hard Activity dates come from
 * the profile as it is now. A Session with a finish record reads as completed.
 */
export async function readProgram(tx: UserTx, userId: string): Promise<ProgramWeek | null> {
  const [found] = await tx
    .select({ block })
    .from(program)
    .innerJoin(block, eq(block.programId, program.id))
    .where(eq(program.userId, userId))
    .orderBy(desc(block.position))
    .limit(1);
  if (found === undefined) return null;

  const sessions = await tx.select().from(session).where(eq(session.blockId, found.block.id));
  if (sessions.length === 0) return null;
  const week = Math.max(...sessions.map((row) => row.weekInBlock));
  const weekSessions = sessions.filter((row) => row.weekInBlock === week);

  const exercises = await tx
    .select({ row: sessionExercise, nameEn: exercise.nameEn, nameEl: exercise.nameEl })
    .from(sessionExercise)
    .innerJoin(exercise, eq(exercise.id, sessionExercise.exerciseId))
    .where(
      inArray(
        sessionExercise.sessionId,
        weekSessions.map((row) => row.id),
      ),
    );

  const finished = await tx
    .select({ sessionId: sessionLog.sessionId })
    .from(sessionLog)
    .where(
      inArray(
        sessionLog.sessionId,
        weekSessions.map((row) => row.id),
      ),
    );

  const [profileRow] = await tx.select().from(profile).where(eq(profile.userId, userId));

  return toProgramWeek({
    block: found.block,
    sessions: weekSessions,
    exercises: exercises.map(({ row, nameEn, nameEl }) => ({
      row,
      name: { en: nameEn, el: nameEl },
    })),
    finishedSessionIds: new Set(finished.map(({ sessionId }) => sessionId)),
    play: profileRow === undefined ? null : toSavedProfile(profileRow),
  });
}
