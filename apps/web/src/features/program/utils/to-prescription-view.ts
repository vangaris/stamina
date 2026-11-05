import type { ProgramExercise } from '@stamina/contracts';
import { PrescriptionUnit } from '@stamina/domain';
import { PrescriptionMessageKey } from '../enums/prescription-message-key.ts';
import type { PrescriptionView } from '../types.ts';

/** Which message reads this exercise's prescription, and the numbers it takes. */
export function toPrescriptionView({
  sets,
  repMin,
  repMax,
  unit,
  rir,
}: ProgramExercise): PrescriptionView {
  const range = repMin === repMax ? `${repMin}` : `${repMin}-${repMax}`;
  let key = PrescriptionMessageKey.Reps;
  if (unit === PrescriptionUnit.Seconds) key = PrescriptionMessageKey.Seconds;
  else if (rir !== null) key = PrescriptionMessageKey.RepsWithReserve;
  return { key, params: { sets, range, rir: rir ?? 0 } };
}
