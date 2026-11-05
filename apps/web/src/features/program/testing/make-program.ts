import type { ProgramExercise, ProgramSession, ProgramWeek } from '@stamina/contracts';
import {
  Emphasis,
  LoadGuidance,
  PrescriptionUnit,
  SessionFocus,
  SessionSlot,
  SessionStatus,
  Weekday,
} from '@stamina/domain';

export function makeExercise(overrides: Partial<ProgramExercise> = {}): ProgramExercise {
  return {
    exerciseId: 'goblet-squat',
    slot: SessionSlot.MainStrength,
    name: { en: 'Goblet squat', el: null },
    sets: 4,
    repMin: 4,
    repMax: 6,
    unit: PrescriptionUnit.Reps,
    rir: 3,
    loadGuidance: LoadGuidance.RpeGuided,
    ...overrides,
  };
}

/** One exercise per slot, in the order a Session is done. */
export function makeSession(overrides: Partial<ProgramSession> = {}): ProgramSession {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    date: '2026-11-06',
    weekday: Weekday.Fri,
    focus: SessionFocus.Lower,
    minutes: 45,
    status: SessionStatus.Planned,
    revision: 1,
    rulesVersion: 1,
    inputsHash: 'a'.repeat(64),
    exercises: [
      makeExercise({ slot: SessionSlot.WarmUp, rir: null, loadGuidance: LoadGuidance.None }),
      makeExercise({ slot: SessionSlot.MainStrength }),
      makeExercise({ slot: SessionSlot.SportSupport }),
      makeExercise({ slot: SessionSlot.AccessoriesCore }),
      makeExercise({
        slot: SessionSlot.CoolDown,
        unit: PrescriptionUnit.Seconds,
        rir: null,
        loadGuidance: LoadGuidance.None,
      }),
    ],
    ...overrides,
  };
}

export function makeProgram(overrides: Partial<ProgramWeek> = {}): ProgramWeek {
  return {
    block: {
      emphasis: Emphasis.Strength,
      startsOn: '2026-11-06',
      weekInBlock: 1,
      limited: false,
      beta: false,
    },
    sessions: [makeSession()],
    ...overrides,
  };
}
