import type { Exercise } from '@stamina/contracts';
import type { ExerciseRow } from './types.ts';

/** A database row in the contract shape (the one the data files and the API answer share). */
export function toExercise(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    source: row.source,
    sourceId: row.sourceId,
    licence: row.licence,
    name: { en: row.nameEn, el: row.nameEl },
    instructions: { en: row.instructionsEn, el: row.instructionsEl },
    equipment: row.equipment,
    locations: row.locations,
    movementPattern: row.movementPattern,
    highLoadAreas: row.highLoadAreas,
    slots: row.slots,
    rirSuitable: row.rirSuitable,
    easierId: row.easierId,
    harderId: row.harderId,
    image: row.image,
  };
}
