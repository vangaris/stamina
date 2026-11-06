import { describe, expect, it } from 'vitest';
import { BodyHalf } from '../enums/body-half.ts';
import { LoadGuidance } from '../enums/load-guidance.ts';
import { ProgressionOutcome } from '../enums/progression-outcome.ts';
import type { LoggedEffort, ProgressLoadInput } from '../types.ts';
import { progressLoad } from './progress-load.ts';

/** Prescribed 3 x 5 at RIR 2, so the target RPE is 8. */
const input = (logged: LoggedEffort[], changes: Partial<ProgressLoadInput> = {}) => ({
  half: BodyHalf.Upper,
  loadGuidance: LoadGuidance.RpeGuided,
  sets: 3,
  repMax: 5,
  rir: 2,
  logged,
  ...changes,
});
const set = (rpe: number, reps = 5, weightKg = 60): LoggedEffort => ({ weightKg, reps, rpe });

describe('progressLoad', () => {
  it('increases when every set hit the top of the range at exactly the target RPE', () => {
    expect(progressLoad(input([set(8), set(8), set(8)]))).toEqual({
      outcome: ProgressionOutcome.Increase,
      suggestedWeightKg: 62.5,
    });
  });
  it('adds more for a lower-body exercise', () => {
    expect(progressLoad(input([set(7), set(8), set(8)], { half: BodyHalf.Lower }))).toEqual({
      outcome: ProgressionOutcome.Increase,
      suggestedWeightKg: 65,
    });
  });
  it('holds one RPE point over the target, and with a set missing', () => {
    expect(progressLoad(input([set(9), set(8), set(8)]))?.outcome).toBe(ProgressionOutcome.Hold);
    expect(progressLoad(input([set(8), set(8)]))?.outcome).toBe(ProgressionOutcome.Hold);
  });
  it('holds when a rep was missed', () => {
    expect(progressLoad(input([set(8), set(8, 4), set(8)]))).toEqual({
      outcome: ProgressionOutcome.Hold,
      suggestedWeightKg: 60,
    });
  });
  it('decreases at exactly two sets two RPE points over the target, not at one', () => {
    expect(progressLoad(input([set(10), set(10), set(8)]))).toEqual({
      outcome: ProgressionOutcome.Decrease,
      suggestedWeightKg: 57,
    });
    expect(progressLoad(input([set(10), set(9), set(9)]))?.outcome).toBe(ProgressionOutcome.Hold);
  });
  it('decreases before it would increase', () => {
    expect(progressLoad(input([set(10), set(10), set(10)]))?.outcome).toBe(
      ProgressionOutcome.Decrease,
    );
  });
  it('rounds to the nearest half kilogram, from the heaviest set', () => {
    expect(progressLoad(input([set(10, 5, 50), set(10, 5, 52.5)]))?.suggestedWeightKg).toBe(50);
    expect(progressLoad(input([set(10, 5, 53), set(10, 5, 41)]))?.suggestedWeightKg).toBe(50.5);
  });
  it('has nothing to progress without sets, effort, a loadable exercise or a weight', () => {
    expect(progressLoad(input([]))).toBeNull();
    expect(progressLoad(input([set(8)], { rir: null }))).toBeNull();
    expect(progressLoad(input([set(8)], { loadGuidance: LoadGuidance.Bodyweight }))).toBeNull();
    expect(progressLoad(input([set(8)], { loadGuidance: LoadGuidance.None }))).toBeNull();
    expect(progressLoad(input([set(8, 5, 0)]))).toBeNull();
  });
});
