import type { SessionDetail } from '@stamina/contracts';
import {
  Emphasis,
  LoadGuidance,
  PrescriptionUnit,
  SessionFocus,
  SessionSlot,
  SessionStatus,
  Weekday,
} from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { SessionProgress } from '../enums/session-progress.ts';
import { toSessionProgress } from './to-session-progress.ts';

const ID = '00000000-0000-4000-8000-000000000001';

function detail(overrides: Partial<SessionDetail> = {}, logged = false): SessionDetail {
  return {
    id: ID,
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
      {
        id: ID,
        exerciseId: 'goblet-squat',
        slot: SessionSlot.MainStrength,
        name: { en: 'Goblet squat', el: null },
        sets: 3,
        repMin: 4,
        repMax: 6,
        unit: PrescriptionUnit.Reps,
        rir: 3,
        loadGuidance: LoadGuidance.RpeGuided,
        suggestedByAi: false,
        easier: null,
        harder: null,
        suggestedWeightKg: null,
        progression: null,
        loggedSets: logged
          ? [{ id: ID, exerciseId: 'goblet-squat', setNumber: 1, weightKg: 20, reps: 6, rpe: 7 }]
          : [],
      },
    ],
    finished: null,
    ...overrides,
  };
}

describe('toSessionProgress', () => {
  it('is not started with no sets and no prefetched Session', () => {
    expect(toSessionProgress(SessionStatus.Planned, undefined)).toBe(SessionProgress.NotStarted);
    expect(toSessionProgress(SessionStatus.Planned, detail())).toBe(SessionProgress.NotStarted);
  });

  it('is in progress once a set is logged', () => {
    expect(toSessionProgress(SessionStatus.Planned, detail({}, true))).toBe(
      SessionProgress.InProgress,
    );
  });

  it('is done when the Program says completed', () => {
    expect(toSessionProgress(SessionStatus.Completed, undefined)).toBe(SessionProgress.Done);
  });

  it('is done when the Session shows a finish the Program does not know of yet', () => {
    const finished = {
      id: ID,
      rpe: 7,
      minutes: 45,
      load: 315,
      finishedAt: '2026-11-06T10:00:00.000Z',
    };

    expect(toSessionProgress(SessionStatus.Planned, detail({ finished }, true))).toBe(
      SessionProgress.Done,
    );
  });
});
