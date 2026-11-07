import type { AdaptationChange, ProgramExercise, ProgramSession } from '@stamina/contracts';
import {
  addDays,
  AdaptationChangeKind,
  daysBetween,
  DAYS_IN_WEEK,
  DELOAD_SET_FACTOR,
  LIGHTER_RIR_STEP,
  LIGHTER_SETS_STEP,
  MAX_RIR,
  RESTART_RIR_STEP,
  SessionFocus,
  SessionSlot,
  weekdayOf,
} from '@stamina/domain';
import { newId } from '@stamina/ids';
import { FAKE_PROGRAM } from '../config.ts';
import type { FakeWeek } from '../types.ts';

export interface FakeAdaptationApplied {
  week: FakeWeek;
  /** Each replaced Session's id and the id of the row that replaces it. */
  superseded: ReadonlyMap<string, string>;
}

const withRir = (exercise: ProgramExercise, rir: (current: number) => number): ProgramExercise => ({
  ...exercise,
  rir: exercise.rir === null ? null : rir(exercise.rir),
});

/**
 * What accepting `change` makes of the fake week, or null when it no longer applies (a Session it
 * names is not in the week, or `isUntouched` says it was started or finished). A stand-in for
 * the domain's `applyAdaptation`, with the same shape of result: a changed Session is a new row
 * (new id, `revision + 1`) and never gets more sets or fewer reps in reserve. The fake has no
 * body areas, so a swap of exercises keeps them. Repeat and Restart replace every untouched
 * Session with a fresh one (revision 1) moved to the new week and open a new Block.
 */
export function applyFakeAdaptation(
  week: FakeWeek,
  change: AdaptationChange,
  isUntouched: (sessionId: string) => boolean,
): FakeAdaptationApplied | null {
  const superseded = new Map<string, string>();
  const revise = (
    sessionId: string,
    patchOf: (session: ProgramSession) => Partial<ProgramSession> | null,
  ): ProgramSession | null => {
    const session = week.sessions.find(({ id }) => id === sessionId);
    if (!session || !isUntouched(sessionId)) return null;
    const patch = patchOf(session);
    if (!patch) return null;
    const revised = { ...session, ...patch, id: newId(), revision: session.revision + 1 };
    superseded.set(session.id, revised.id);
    return revised;
  };
  const result = (revisions: readonly (ProgramSession | null)[]): FakeAdaptationApplied | null => {
    if (revisions.some((revision) => revision === null)) return null;
    const sessions = week.sessions
      .map((session) => revisions.find((r) => r && superseded.get(session.id) === r.id) ?? session)
      .sort((a, b) => a.date.localeCompare(b.date));
    return { week: { ...week, sessions }, superseded };
  };

  switch (change.kind) {
    case AdaptationChangeKind.MoveSession:
      return result([
        revise(change.sessionId, () => ({ date: change.to, weekday: weekdayOf(change.to) })),
      ]);
    case AdaptationChangeKind.SwapToRecovery:
      return result([
        revise(change.sessionId, ({ exercises }) => {
          const kept = exercises.filter(({ slot }) => slot !== SessionSlot.MainStrength);
          return { focus: SessionFocus.Recovery, exercises: kept.length > 0 ? kept : exercises };
        }),
      ]);
    case AdaptationChangeKind.DropSet:
      return result([
        revise(change.sessionId, ({ exercises }) =>
          exercises.some(({ sets }) => sets > 1)
            ? {
                exercises: exercises.map((exercise) => ({
                  ...exercise,
                  sets: Math.max(1, exercise.sets - 1),
                })),
              }
            : null,
        ),
      ]);
    case AdaptationChangeKind.LightenSession:
      return result([
        revise(change.sessionId, ({ exercises }) => ({
          exercises: exercises.map((exercise) => ({
            ...withRir(exercise, (rir) => Math.min(MAX_RIR, rir + LIGHTER_RIR_STEP)),
            sets: Math.max(1, exercise.sets - LIGHTER_SETS_STEP),
          })),
        })),
      ]);
    case AdaptationChangeKind.SwapExercises:
      return result([revise(change.sessionId, () => ({}))]);
    case AdaptationChangeKind.DeloadWeek:
      return result(
        change.sessionIds.map((sessionId) =>
          revise(sessionId, ({ exercises }) => ({
            exercises: exercises.map((exercise) => ({
              ...withRir(exercise, (rir) => Math.max(rir, FAKE_PROGRAM.deloadRir)),
              sets: Math.max(1, Math.ceil(exercise.sets * DELOAD_SET_FACTOR)),
            })),
          })),
        ),
      );
    case AdaptationChangeKind.RepeatWeek:
    case AdaptationChangeKind.RestartBlock: {
      const restart = change.kind === AdaptationChangeKind.RestartBlock;
      const weekInBlock = restart ? 1 : change.weekInBlock;
      const firstDay = addDays(week.block.startsOn, (week.block.weekInBlock - 1) * DAYS_IN_WEEK);
      const shift = daysBetween(firstDay, change.startsOn);
      const replaced = week.sessions
        .filter(({ id }) => isUntouched(id))
        .map((session): ProgramSession => {
          const date = addDays(session.date, shift);
          const fresh = {
            ...session,
            id: newId(),
            revision: 1,
            date,
            weekday: weekdayOf(date),
            exercises: restart
              ? session.exercises.map((exercise) =>
                  withRir(exercise, (rir) => Math.min(MAX_RIR, rir + RESTART_RIR_STEP)),
                )
              : session.exercises,
          };
          superseded.set(session.id, fresh.id);
          return fresh;
        });
      if (replaced.length === 0) return null;
      const sessions = [...week.sessions.filter(({ id }) => !superseded.has(id)), ...replaced].sort(
        (a, b) => a.date.localeCompare(b.date),
      );
      return {
        week: {
          ...week,
          block: {
            ...week.block,
            startsOn: addDays(change.startsOn, -(weekInBlock - 1) * DAYS_IN_WEEK),
            weekInBlock,
          },
          sessions,
        },
        superseded,
      };
    }
  }
}
