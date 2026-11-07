import { describe, expect, it } from 'vitest';
import { LoadGuidance } from '../enums/load-guidance.ts';
import { PrescriptionUnit } from '../enums/prescription-unit.ts';
import { SessionSlot } from '../enums/session-slot.ts';
import type { GeneratedExercise } from '../types.ts';
import { dropSets } from './drop-sets.ts';

const exercise = (sets: number): GeneratedExercise => ({
  exerciseId: 'x',
  slot: SessionSlot.MainStrength,
  sets,
  repMin: 5,
  repMax: 8,
  unit: PrescriptionUnit.Reps,
  rir: 3,
  loadGuidance: LoadGuidance.RpeGuided,
});

describe('dropSets', () => {
  it('takes one set off every exercise with more than one, and no more', () => {
    expect(dropSets([exercise(4), exercise(2), exercise(1)])).toEqual([
      exercise(3),
      exercise(1),
      exercise(1),
    ]);
  });

  it('answers null when every exercise has one set', () => {
    expect(dropSets([exercise(1), exercise(1)])).toBeNull();
  });
});
