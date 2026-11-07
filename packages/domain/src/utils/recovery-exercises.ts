import { SessionFocus } from '../enums/session-focus.ts';
import { TrainingMode } from '../enums/training-mode.ts';
import type { AdaptationContext, AdaptationSession, GeneratedExercise } from '../types.ts';
import { pickExercises } from './pick-exercises.ts';
import { prescribePicks } from './prescribe-picks.ts';
import { usedElsewhere } from './used-elsewhere.ts';

/**
 * The exercises of the Session as a Recovery Session on the same day, or `null` when the library
 * cannot fill one for the person's equipment and excluded areas.
 */
export function recoveryExercises(
  context: AdaptationContext,
  session: AdaptationSession,
): GeneratedExercise[] | null {
  const { generation } = context;
  const picks = pickExercises({
    library: generation.library,
    equipment: generation.equipment,
    excludedAreas: generation.excludedAreas,
    focus: SessionFocus.Recovery,
    minutes: session.minutes,
    limited: generation.mode === TrainingMode.Limited,
    sport: generation.sport,
    usedInWeek: usedElsewhere(context, session),
  });
  return picks === null ? null : prescribePicks(context, session, picks);
}
