import { BodyArea } from '../enums/body-area.ts';
import { SessionSlot } from '../enums/session-slot.ts';
import type { AdaptationContext, AdaptationSession } from '../types.ts';

/**
 * The body areas the Session's main-strength exercises load, in `BodyArea` order: what a sore
 * area makes the Session avoid. Empty when it has no main-strength exercise (a Recovery Session).
 */
export function targetedAreas(
  { generation }: AdaptationContext,
  session: AdaptationSession,
): BodyArea[] {
  const library = new Map(generation.library.map((exercise) => [exercise.id, exercise]));
  const loaded = new Set(
    session.exercises
      .filter((exercise) => exercise.slot === SessionSlot.MainStrength)
      .flatMap((exercise) => library.get(exercise.exerciseId)?.highLoadAreas ?? []),
  );
  return Object.values(BodyArea).filter((area) => loaded.has(area));
}
