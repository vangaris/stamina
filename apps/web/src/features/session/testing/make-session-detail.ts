import type { LogSet, SessionDetail, SessionExercise } from '@stamina/contracts';
import {
  Emphasis,
  LoadGuidance,
  PrescriptionUnit,
  SessionFocus,
  SessionSlot,
  SessionStatus,
  Weekday,
} from '@stamina/domain';

export const SESSION_ID = '00000000-0000-4000-8000-000000000001';

let counter = 0;

/** A valid uuid that differs on every call. */
export function nextUuid(): string {
  counter += 1;
  return `00000000-0000-4000-8000-${String(counter).padStart(12, '0')}`;
}

export function makeLoggedSet(overrides: Partial<LogSet> = {}): LogSet {
  return {
    id: nextUuid(),
    exerciseId: 'goblet-squat',
    setNumber: 1,
    weightKg: 20,
    reps: 6,
    rpe: 7,
    ...overrides,
  };
}

export function makeSessionExercise(overrides: Partial<SessionExercise> = {}): SessionExercise {
  return {
    id: nextUuid(),
    exerciseId: 'goblet-squat',
    slot: SessionSlot.MainStrength,
    name: { en: 'Goblet squat', el: 'Κάθισμα goblet' },
    sets: 3,
    repMin: 4,
    repMax: 6,
    unit: PrescriptionUnit.Reps,
    rir: 3,
    loadGuidance: LoadGuidance.RpeGuided,
    suggestedByAi: false,
    easier: { exerciseId: 'box-squat', name: { en: 'Box squat', el: null } },
    harder: { exerciseId: 'front-squat', name: { en: 'Front squat', el: 'Μπροστινό κάθισμα' } },
    suggestedWeightKg: null,
    progression: null,
    loggedSets: [],
    ...overrides,
  };
}

/**
 * A warm-up, a main-strength exercise and an accessory (3 sets each unless said), with an
 * easier and a harder variant on the main one.
 */
export function makeSessionDetail(overrides: Partial<SessionDetail> = {}): SessionDetail {
  return {
    id: SESSION_ID,
    date: '2026-11-06',
    weekday: Weekday.Fri,
    focus: SessionFocus.Lower,
    minutes: 45,
    status: SessionStatus.Planned,
    revision: 1,
    rulesVersion: 1,
    inputsHash: 'a'.repeat(64),
    emphasis: Emphasis.Strength,
    exercises: [
      makeSessionExercise({
        exerciseId: 'leg-swings',
        slot: SessionSlot.WarmUp,
        name: { en: 'Leg swings', el: null },
        sets: 1,
        repMin: 10,
        repMax: 10,
        rir: null,
        loadGuidance: LoadGuidance.None,
        easier: null,
        harder: null,
      }),
      makeSessionExercise(),
      makeSessionExercise({
        exerciseId: 'plank',
        slot: SessionSlot.AccessoriesCore,
        name: { en: 'Plank', el: null },
        sets: 2,
        repMin: 30,
        repMax: 45,
        unit: PrescriptionUnit.Seconds,
        rir: null,
        loadGuidance: LoadGuidance.Bodyweight,
        easier: null,
        harder: null,
      }),
    ],
    finished: null,
    ...overrides,
  };
}
