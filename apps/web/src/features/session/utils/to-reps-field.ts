import { PrescriptionUnit } from '@stamina/domain';
import { REPS_STEP, SECONDS_STEP } from '../config.ts';
import { RepsFieldKey } from '../enums/reps-field-key.ts';
import { RepsUnitKey } from '../enums/reps-unit-key.ts';
import type { RepsField } from '../types.ts';

/** The reps stepper's texts and step: timed holds count seconds, in bigger steps. */
export function toRepsField(unit: PrescriptionUnit): RepsField {
  if (unit === PrescriptionUnit.Seconds) {
    return {
      label: RepsFieldKey.SecondsLabel,
      decrease: RepsFieldKey.SecondsDecrease,
      increase: RepsFieldKey.SecondsIncrease,
      unit: RepsUnitKey.Seconds,
      step: SECONDS_STEP,
    };
  }
  return {
    label: RepsFieldKey.RepsLabel,
    decrease: RepsFieldKey.RepsDecrease,
    increase: RepsFieldKey.RepsIncrease,
    unit: RepsUnitKey.Reps,
    step: REPS_STEP,
  };
}
