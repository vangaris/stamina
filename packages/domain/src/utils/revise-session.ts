import type { AdaptationSession, GeneratedSession, RevisedSession } from '../types.ts';

/** The Session as a revision of itself: the same plan with `changes` applied, `supersedes` its id. */
export function reviseSession(
  session: AdaptationSession,
  changes: Partial<Pick<GeneratedSession, 'date' | 'weekday' | 'focus' | 'exercises'>> = {},
): RevisedSession {
  return {
    date: session.date,
    weekday: session.weekday,
    focus: session.focus,
    minutes: session.minutes,
    exercises: session.exercises,
    ...changes,
    supersedes: session.id,
  };
}
