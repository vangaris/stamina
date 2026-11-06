import { bodyHalfOf, progressLoad, type Progression } from '@stamina/domain';
import { and, asc, desc, eq, inArray, lt, ne } from 'drizzle-orm';
import { session, sessionExercise, sessionLog, setLog } from '../db/schema.ts';
import type { UserTx } from '../db/types.ts';
import type { SessionPlan } from './types.ts';

/**
 * Progression for each exercise of the Session, by planned exercise id, from the user's most
 * recent earlier finished Session in which that exact exercise had sets logged. Earlier means a
 * Session dated before this one, so reading an old Session never looks at what came after it. A
 * variant logged in place of the exercise counts for the variant only. The prescription to judge
 * against (sets, top of range, reps in reserve) is the one of the earlier Session's exercise the
 * sets were logged under; where one performed exercise was logged under several, the first by
 * position and set number. Exercises with no history, or that `progressLoad` has nothing to say
 * about, are absent.
 */
export async function readProgressions(
  tx: UserTx,
  userId: string,
  plan: SessionPlan,
): Promise<Map<string, Progression>> {
  const progressions = new Map<string, Progression>();
  const exerciseIds = [...new Set(plan.exercises.map(({ row }) => row.exerciseId))];

  const latest = await tx
    .selectDistinctOn([setLog.exerciseId], {
      exerciseId: setLog.exerciseId,
      sessionId: setLog.sessionId,
    })
    .from(setLog)
    .innerJoin(sessionLog, eq(sessionLog.sessionId, setLog.sessionId))
    .innerJoin(session, eq(session.id, setLog.sessionId))
    .where(
      and(
        eq(setLog.userId, userId),
        inArray(setLog.exerciseId, exerciseIds),
        ne(setLog.sessionId, plan.session.id),
        lt(session.date, plan.session.date),
      ),
    )
    .orderBy(asc(setLog.exerciseId), desc(session.date), desc(sessionLog.finishedAt));
  if (latest.length === 0) return progressions;

  const logged = await tx
    .select({ set: setLog, prescribed: sessionExercise })
    .from(setLog)
    .innerJoin(sessionExercise, eq(sessionExercise.id, setLog.sessionExerciseId))
    .where(
      and(
        eq(setLog.userId, userId),
        inArray(setLog.exerciseId, exerciseIds),
        inArray(
          setLog.sessionId,
          latest.map(({ sessionId }) => sessionId),
        ),
      ),
    )
    .orderBy(asc(sessionExercise.position), asc(setLog.setNumber));

  for (const planned of plan.exercises) {
    const last = latest.find(({ exerciseId }) => exerciseId === planned.row.exerciseId);
    if (last === undefined) continue;
    const sets = logged.filter(
      ({ set }) => set.sessionId === last.sessionId && set.exerciseId === last.exerciseId,
    );
    const [first] = sets;
    if (first === undefined) continue;
    const progression = progressLoad({
      half: bodyHalfOf(planned.movementPattern),
      loadGuidance: planned.row.loadGuidance,
      sets: first.prescribed.sets,
      repMax: first.prescribed.repMax,
      rir: first.prescribed.rir,
      logged: sets.map(({ set }) => set),
    });
    if (progression !== null) progressions.set(planned.row.exerciseId, progression);
  }
  return progressions;
}
