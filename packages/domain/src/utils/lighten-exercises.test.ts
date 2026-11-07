import { describe, expect, it } from 'vitest';
import { MAX_RIR } from '../config.ts';
import { LoadGuidance } from '../enums/load-guidance.ts';
import { PrescriptionUnit } from '../enums/prescription-unit.ts';
import { SessionSlot } from '../enums/session-slot.ts';
import type { GeneratedExercise } from '../types.ts';
import { lightenExercises } from './lighten-exercises.ts';

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

describe('lightenExercises', () => {
  it('takes a set off and adds a rep in reserve', () => {
    expect(lightenExercises([exercise(4, 3), exercise(3, 2)])).toEqual([
      exercise(3, 4),
      exercise(2, 3),
    ]);
  });

  it('never goes below one set or past the most reps in reserve, and leaves unrated exercises unrated', () => {
    expect(lightenExercises([exercise(2, MAX_RIR), exercise(1, 3), exercise(2, null)])).toEqual([
      exercise(1, MAX_RIR),
      exercise(1, 4),
      exercise(1, null),
    ]);
  });

  it('answers null when nothing changes', () => {
    expect(lightenExercises([exercise(1, MAX_RIR), exercise(1, null)])).toBeNull();
  });
});
