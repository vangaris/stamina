import { sessionDetailSchema, type SessionDetail } from '@stamina/contracts';
import { SessionStatus, type Progression } from '@stamina/domain';
import type { SessionPlan, SetLogRow } from './types.ts';

/**
 * The contract's `SessionDetail` from the stored plan, the sets logged so far and the progression
 * of each exercise (by planned exercise id). A Session is completed exactly when it has a finish
 * record; the stored `status` column stays `planned`. The schema also guards against a corrupt row.
 */
export function toSessionDetail(
  { session, emphasis, exercises, finished }: SessionPlan,
  sets: readonly SetLogRow[],
  progressions: ReadonlyMap<string, Progression>,
): SessionDetail {
  return sessionDetailSchema.parse({
    id: session.id,
    date: session.date,
    weekday: session.weekday,
    focus: session.focus,
    minutes: session.minutes,
    status: finished === null ? session.status : SessionStatus.Completed,
    revision: session.revision,
    rulesVersion: session.rulesVersion,
    inputsHash: session.inputsHash,
    emphasis,
    finished,
    exercises: exercises.map(({ row, name, easier, harder }) => {
      const progression = progressions.get(row.exerciseId) ?? null;
      return {
        id: row.id,
        exerciseId: row.exerciseId,
        slot: row.slot,
        name,
        sets: row.sets,
        repMin: row.repMin,
        repMax: row.repMax,
        unit: row.unit,
        rir: row.rir,
        loadGuidance: row.loadGuidance,
        suggestedByAi: session.model !== null,
        easier,
        harder,
        suggestedWeightKg: progression?.suggestedWeightKg ?? null,
        progression: progression?.outcome ?? null,
        loggedSets: sets
          .filter((set) => set.sessionExerciseId === row.id)
          .sort((a, b) => a.setNumber - b.setNumber)
          .map((set) => ({
            id: set.id,
            exerciseId: set.exerciseId,
            setNumber: set.setNumber,
            weightKg: set.weightKg,
            reps: set.reps,
            rpe: set.rpe,
          })),
      };
    }),
  });
}
