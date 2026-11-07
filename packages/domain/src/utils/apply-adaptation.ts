import { DAYS_IN_WEEK, RESTART_RIR_STEP } from '../config.ts';
import { AdaptationChangeKind } from '../enums/adaptation-change-kind.ts';
import { SessionFocus } from '../enums/session-focus.ts';
import type {
  AdaptationChange,
  AdaptationContext,
  AppliedAdaptation,
  RevisedSession,
} from '../types.ts';
import { addDays } from './add-days.ts';
import { deloadExercises } from './deload-exercises.ts';
import { dropSets } from './drop-sets.ts';
import { lightenExercises } from './lighten-exercises.ts';
import { recoveryExercises } from './recovery-exercises.ts';
import { regenerateWeek } from './regenerate-week.ts';
import { reviseSession } from './revise-session.ts';
import { revisableSession } from './revisable-session.ts';
import { swapSessionExercises } from './swap-session-exercises.ts';
import { weekdayOf } from './weekday-of.ts';

/** Revisions inside the current Block. */
const inBlock = (sessions: RevisedSession[]): AppliedAdaptation => ({
  block: null,
  supersedes: sessions.map(({ supersedes }) => supersedes!),
  sessions,
});

/**
 * What accepting an Adaptation stores, from the Sessions as they are now, or `null` when the
 * change no longer applies: a Session it names is not current, is finished or started, or the
 * change would do nothing. Never more sets, fewer reps in reserve or a Session earlier than
 * today. A move, swap, drop, lighten or Deload revises Sessions inside the current Block; a
 * repeated week or restarted Block (one rep more in reserve) is a new Block's week by rules only.
 */
export function applyAdaptation(
  change: AdaptationChange,
  context: AdaptationContext,
): AppliedAdaptation | null {
  switch (change.kind) {
    case AdaptationChangeKind.MoveSession: {
      const session = revisableSession(context, change.sessionId);
      if (session === undefined || session.date !== change.from) return null;
      const weekEndsOn = addDays(context.weekStartsOn, DAYS_IN_WEEK - 1);
      if (
        change.to < context.today ||
        change.to < context.weekStartsOn ||
        change.to > weekEndsOn ||
        context.sessions.some((other) => other.id !== session.id && other.date === change.to)
      ) {
        return null;
      }
      return inBlock([reviseSession(session, { date: change.to, weekday: weekdayOf(change.to) })]);
    }
    case AdaptationChangeKind.SwapToRecovery: {
      const session = revisableSession(context, change.sessionId);
      if (session === undefined) return null;
      const exercises = recoveryExercises(context, session);
      if (exercises === null) return null;
      return inBlock([reviseSession(session, { focus: SessionFocus.Recovery, exercises })]);
    }
    case AdaptationChangeKind.DropSet: {
      const session = revisableSession(context, change.sessionId);
      const exercises = session && dropSets(session.exercises);
      return session && exercises ? inBlock([reviseSession(session, { exercises })]) : null;
    }
    case AdaptationChangeKind.LightenSession: {
      const session = revisableSession(context, change.sessionId);
      const exercises = session && lightenExercises(session.exercises);
      return session && exercises ? inBlock([reviseSession(session, { exercises })]) : null;
    }
    case AdaptationChangeKind.SwapExercises: {
      const session = revisableSession(context, change.sessionId);
      const exercises = session && swapSessionExercises(context, session, change.areas);
      return session && exercises ? inBlock([reviseSession(session, { exercises })]) : null;
    }
    case AdaptationChangeKind.DeloadWeek: {
      const sessions = [...new Set(change.sessionIds)].map((id) => revisableSession(context, id));
      if (sessions.length === 0 || sessions.some((session) => session === undefined)) return null;
      return inBlock(
        sessions.map((session) =>
          reviseSession(session!, { exercises: deloadExercises(session!.exercises) }),
        ),
      );
    }
    case AdaptationChangeKind.RepeatWeek:
      return regenerateWeek(context, {
        weekInBlock: change.weekInBlock,
        startsOn: change.startsOn,
      });
    case AdaptationChangeKind.RestartBlock:
      return regenerateWeek(context, {
        weekInBlock: 1,
        startsOn: change.startsOn,
        rirBoost: RESTART_RIR_STEP,
      });
  }
}
