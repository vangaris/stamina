import { PrescriptionUnit } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { REPS_STEP, SECONDS_STEP } from '../config.ts';
import { RepsFieldKey } from '../enums/reps-field-key.ts';
import { RepsUnitKey } from '../enums/reps-unit-key.ts';
import { toRepsField } from './to-reps-field.ts';

describe('toRepsField', () => {
  it('counts reps one at a time', () => {
    expect(toRepsField(PrescriptionUnit.Reps)).toEqual({
      label: RepsFieldKey.RepsLabel,
      decrease: RepsFieldKey.RepsDecrease,
      increase: RepsFieldKey.RepsIncrease,
      unit: RepsUnitKey.Reps,
      step: REPS_STEP,
    });
  });

  it('counts the seconds of a timed hold in bigger steps', () => {
    expect(toRepsField(PrescriptionUnit.Seconds)).toEqual({
      label: RepsFieldKey.SecondsLabel,
      decrease: RepsFieldKey.SecondsDecrease,
      increase: RepsFieldKey.SecondsIncrease,
      unit: RepsUnitKey.Seconds,
      step: SECONDS_STEP,
    });
  });
});
