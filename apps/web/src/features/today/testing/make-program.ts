import type { ProgramSession, ProgramWeek } from '@stamina/contracts';
import {
  Emphasis,
  LoadGuidance,
  PrescriptionUnit,
  SessionFocus,
  SessionSlot,
  SessionStatus,
  Weekday,
} from '@stamina/domain';

export const TODAY_DATE = '2026-11-07';

export function makeSession(overrides: Partial<ProgramSession> = {}): ProgramSession {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    date: TODAY_DATE,
    weekday: Weekday.Sat,
    focus: SessionFocus.Lower,
    minutes: 45,
    status: SessionStatus.Planned,
    revision: 1,
    rulesVersion: 1,
    inputsHash: 'a'.repeat(64),
    exercises: [
      {
        exerciseId: 'goblet-squat',
        slot: SessionSlot.MainStrength,
        name: { en: 'Goblet squat', el: null },
        sets: 4,
        repMin: 4,
        repMax: 6,
        unit: PrescriptionUnit.Reps,
        rir: 3,
        loadGuidance: LoadGuidance.RpeGuided,
        suggestedByAi: false,
      },
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
    hardActivityDates: [],
    ...overrides,
  };
}
