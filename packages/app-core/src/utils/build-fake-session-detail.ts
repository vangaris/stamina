import type {
  ExerciseVariant,
  FinishedSession,
  LoggedSet,
  ProgramExercise,
  ProgramSession,
  SessionDetail,
} from '@stamina/contracts';
import { Emphasis, LoadGuidance } from '@stamina/domain';
import { FAKE_PROGRAM, FAKE_SESSION } from '../config.ts';
import { sessionExerciseIds } from './session-exercise-ids.ts';

const variantOf = (
  exercise: ProgramExercise,
  { idSuffix, nameSuffix }: { idSuffix: string; nameSuffix: string },
): ExerciseVariant | null =>
  exercise.loadGuidance === LoadGuidance.RpeGuided
    ? {
        exerciseId: `${exercise.exerciseId}${idSuffix}`,
        name: { en: `${exercise.name.en}${nameSuffix}`, el: null },
      }
    : null;

/**
 * A fake Program Session as the Session screen reads it: every exercise gets an id, RPE-guided
 * ones get an easier and a harder variant, there is no history to suggest a weight from, and the
 * sets (those of the exercise or its variants, in set order) and the finish are what was logged.
 */
export function buildFakeSessionDetail(
  session: ProgramSession,
  emphasis: Emphasis,
  sets: readonly LoggedSet[],
  finished: FinishedSession | null,
): SessionDetail {
  const { exercises, ...rest } = session;
  const sessionNumber = Number.parseInt(session.id.slice(-FAKE_PROGRAM.idDigits), 10);
  return {
    ...rest,
    emphasis,
    finished,
    exercises: exercises.map((exercise, index) => {
      const withVariants = {
        ...exercise,
        easier: variantOf(exercise, FAKE_SESSION.easier),
        harder: variantOf(exercise, FAKE_SESSION.harder),
      };
      const ids = sessionExerciseIds(withVariants);
      const number = sessionNumber * FAKE_SESSION.exercisesPerSession + index;
      return {
        ...withVariants,
        id: `${FAKE_SESSION.exerciseIdPrefix}${String(number).padStart(FAKE_PROGRAM.idDigits, '0')}`,
        suggestedWeightKg: null,
        progression: null,
        loggedSets: sets
          .filter((set) => ids.includes(set.exerciseId))
          .sort((a, b) => a.setNumber - b.setNumber),
      };
    }),
  };
}
