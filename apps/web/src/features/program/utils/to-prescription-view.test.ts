import { PrescriptionUnit } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { PrescriptionMessageKey } from '../enums/prescription-message-key.ts';
import { makeExercise } from '../testing/make-program.ts';
import { toPrescriptionView } from './to-prescription-view.ts';

describe('toPrescriptionView', () => {
  it('reads sets, a rep range and the reserve to stop at', () => {
    expect(toPrescriptionView(makeExercise({ sets: 3, repMin: 4, repMax: 6, rir: 3 }))).toEqual({
      key: PrescriptionMessageKey.RepsWithReserve,
      params: { sets: 3, range: '4-6', rir: 3 },
    });
  });

  it('drops the reserve where effort is not rated', () => {
    expect(toPrescriptionView(makeExercise({ rir: null })).key).toBe(PrescriptionMessageKey.Reps);
  });

  it('reads seconds for holds, and a single number when the range is one value', () => {
    expect(
      toPrescriptionView(
        makeExercise({ unit: PrescriptionUnit.Seconds, repMin: 30, repMax: 30, rir: null }),
      ),
    ).toEqual({
      key: PrescriptionMessageKey.Seconds,
      params: { sets: 4, range: '30', rir: 0 },
    });
  });
});
