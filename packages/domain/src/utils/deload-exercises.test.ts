import { describe, expect, it } from 'vitest';
import { LoadGuidance } from '../enums/load-guidance.ts';
import { PrescriptionUnit } from '../enums/prescription-unit.ts';
import { SessionSlot } from '../enums/session-slot.ts';
import type { GeneratedExercise } from '../types.ts';
import { deloadExercises } from './deload-exercises.ts';

const exercise = (sets: number, rir: number | null): GeneratedExercise => ({
  exerciseId: 'x',
  slot: SessionSlot.MainStrength,
  sets,
  repMin: 5,
  repMax: 8,
  unit: PrescriptionUnit.Reps,
  rir,
  loadGuidance: LoadGuidance.RpeGuided,
});

describe('deloadExercises', () => {
  it('halves the sets rounding up, never below one', () => {
    expect(
      deloadExercises([4, 3, 2, 1].map((sets) => exercise(sets, 3))).map((e) => e.sets),
    ).toEqual([2, 2, 1, 1]);
  });

  it('lifts reps in reserve to the Deload week, never lowers them, and leaves unrated exercises unrated', () => {
    expect(
      deloadExercises([exercise(2, 1), exercise(2, 5), exercise(2, null)]).map((e) => e.rir),
    ).toEqual([4, 5, null]);
  });
});
