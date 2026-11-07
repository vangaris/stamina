import { SessionSlot } from '../enums/session-slot.ts';
import { TrainingMode } from '../enums/training-mode.ts';
import type { BodyArea } from '../enums/body-area.ts';
import type { AdaptationContext, AdaptationSession, GeneratedExercise } from '../types.ts';
import { compareText } from './compare-text.ts';
import { fallbackRir } from './fallback-rir.ts';
import { slotCandidates } from './slot-candidates.ts';
import { swapPrescription } from './swap-prescription.ts';
import { usedElsewhere } from './used-elsewhere.ts';

/**
 * The Session's exercises with every rated one that loads any of `areas` replaced, in the same
 * slot, by a library exercise that loads none of `areas` or the person's excluded areas and is not
 * already in the Session (one not used elsewhere in the week and of the same movement pattern
 * first, then by id). `null` when none loads `areas` or any cannot be replaced: never a half Session.
 */
export function swapSessionExercises(
  context: AdaptationContext,
  session: AdaptationSession,
  areas: readonly BodyArea[],
): GeneratedExercise[] | null {
  const { generation } = context;
  const library = new Map(generation.library.map((exercise) => [exercise.id, exercise]));
  const loadsTargeted = (exerciseId: string): boolean =>
    library.get(exerciseId)?.highLoadAreas.some((area) => areas.includes(area)) ?? false;
  const unavailable = usedElsewhere(context, session);
  const input = {
    library: generation.library,
    equipment: generation.equipment,
    excludedAreas: [...generation.excludedAreas, ...areas],
    focus: session.focus,
    minutes: session.minutes,
    limited: generation.mode === TrainingMode.Limited,
    sport: generation.sport,
    usedInWeek: unavailable,
  };
  const fallback = fallbackRir(context, session);
  const taken = new Set(session.exercises.map((exercise) => exercise.exerciseId));

  let replaced = 0;
  const result: GeneratedExercise[] = [];
  for (const exercise of session.exercises) {
    const rated = exercise.slot !== SessionSlot.WarmUp && exercise.slot !== SessionSlot.CoolDown;
    if (!rated || !loadsTargeted(exercise.exerciseId)) {
      result.push(exercise);
      continue;
    }
    const pattern = library.get(exercise.exerciseId)?.movementPattern;
    const [best] = slotCandidates(input, exercise.slot, taken).sort(
      (a, b) =>
        Number(unavailable.has(a.id)) - Number(unavailable.has(b.id)) ||
        Number(a.movementPattern !== pattern) - Number(b.movementPattern !== pattern) ||
        compareText(a.id, b.id),
    );
    if (best === undefined) return null;
    taken.add(best.id);
    replaced += 1;
    result.push({
      exerciseId: best.id,
      slot: exercise.slot,
      ...swapPrescription(exercise, best, fallback),
    });
  }
  return replaced === 0 ? null : result;
}
