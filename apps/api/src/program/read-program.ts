import type { ProgramWeek } from '@stamina/contracts';
import { eq, inArray } from 'drizzle-orm';
import { exercise, profile, sessionExercise, sessionLog } from '../db/schema.ts';
import type { UserTx } from '../db/types.ts';
import { toSavedProfile } from '../profile/to-saved-profile.ts';
import { readCurrentWeek } from './read-current-week.ts';
import { toProgramWeek } from './to-program-week.ts';

/**
 * The user's latest generated week, or `null` before their Program exists: its current Sessions
 * only (`readCurrentWeek`), so a revision shows and the Session it replaced does not. Reads as the app role,
 * so row-level security keeps it to the user's own rows. The week's hard Activity dates come from
 * the profile as it is now. A Session with a finish record reads as completed.
 */
export async function readProgram(tx: UserTx, userId: string): Promise<ProgramWeek | null> {
  const found = await readCurrentWeek(tx, userId);
  if (found === null) return null;
  const weekSessions = found.sessions;

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
