import type { Exercise } from '@stamina/contracts';
import type { ExerciseRowInsert } from './types.ts';

/** A library entry as a row to write. The links are not set here: the sync writes them in a second pass. */
export function toExerciseRow(exercise: Exercise): ExerciseRowInsert {
  return {
    id: exercise.id,
    source: exercise.source,
    sourceId: exercise.sourceId,
    licence: exercise.licence,
    nameEn: exercise.name.en,
    nameEl: exercise.name.el,
    instructionsEn: exercise.instructions.en,
    instructionsEl: exercise.instructions.el,
    equipment: exercise.equipment,
    locations: exercise.locations,
    movementPattern: exercise.movementPattern,
    highLoadAreas: exercise.highLoadAreas,
    slots: exercise.slots,
    rirSuitable: exercise.rirSuitable,
    easierId: null,
    harderId: null,
    image: exercise.image,
  };
}
