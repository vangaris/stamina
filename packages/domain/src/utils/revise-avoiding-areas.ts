import { SessionFocus } from '../enums/session-focus.ts';
import { TrainingMode } from '../enums/training-mode.ts';
import type { AdaptationContext, RevisedSession } from '../types.ts';
import { pickExercises } from './pick-exercises.ts';
import { prescribePicks } from './prescribe-picks.ts';
import { reviseSession } from './revise-session.ts';
import { upcomingSessions } from './upcoming-sessions.ts';
import { usedElsewhere } from './used-elsewhere.ts';

/**
 * The rewrite after new pain is reported: every upcoming Session (not finished, not started,
 * dated today or later) with an exercise on an excluded area, as a revision with exercises that
 * avoid them. The same focus is picked first (`pickExercises` over the library minus the
 * excluded areas; exercises already in the Session's slots keep their prescription); when the
 * library cannot fill it the Session becomes a Recovery Session, and when it cannot fill that
 * either the Session is left out. Sessions that touch no excluded area are not returned. Not a
 * suggestion: the server stores the revisions straight away.
 */
export function reviseAvoidingAreas(context: AdaptationContext): RevisedSession[] {
  const { generation } = context;
  const library = new Map(generation.library.map((exercise) => [exercise.id, exercise]));
  const limited = generation.mode === TrainingMode.Limited;

  const revised: RevisedSession[] = [];
  /** The week as the revisions so far leave it, so two Sessions do not both take the same replacement. */
  let week = context;
  for (const session of upcomingSessions(context)) {
    const touches = session.exercises.some((exercise) =>
      library
        .get(exercise.exerciseId)
        ?.highLoadAreas.some((area) => generation.excludedAreas.includes(area)),
    );
    if (!touches) continue;
    for (const focus of new Set([session.focus, SessionFocus.Recovery])) {
      const picks = pickExercises({
        library: generation.library,
        equipment: generation.equipment,
        excludedAreas: generation.excludedAreas,
        focus,
        minutes: session.minutes,
        limited,
        sport: generation.sport,
        usedInWeek: usedElsewhere(week, session),
      });
      const exercises = picks && prescribePicks(context, session, picks);
      if (exercises) {
        const revision = reviseSession(session, { focus, exercises });
        revised.push(revision);
        week = {
          ...week,
          sessions: week.sessions.map((other) =>
            other.id === session.id ? { ...other, focus, exercises } : other,
          ),
        };
        break;
      }
    }
  }
  return revised;
}
