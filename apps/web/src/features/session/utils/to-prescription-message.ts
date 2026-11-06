import type { SessionExercise } from '@stamina/contracts';
import { PrescriptionUnit } from '@stamina/domain';
import { formatRepRange } from '../../program/index.ts';
import { TargetMessageKey } from '../enums/target-message-key.ts';
import type { MessageView } from '../types.ts';

/** "3 x 4-6 reps", or "1 x 30-45 seconds" for a timed hold. */
export function toPrescriptionMessage({
  sets,
  repMin,
  repMax,
  unit,
}: Pick<SessionExercise, 'sets' | 'repMin' | 'repMax' | 'unit'>): MessageView {
  const range = formatRepRange({ repMin, repMax });
  const key = unit === PrescriptionUnit.Seconds ? TargetMessageKey.Seconds : TargetMessageKey.Reps;
  return { key, params: { sets, range } };
}
