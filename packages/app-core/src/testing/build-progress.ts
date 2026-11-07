import type { Progress } from '@stamina/contracts';
import { VerdictKind } from '@stamina/domain';

/** A Progress for a person two Sessions into the first week, with one earlier week to compare with. */
export function buildProgress(overrides: Partial<Progress> = {}): Progress {
  return {
    weekStartsOn: '2026-11-06',
    sessions: { done: 2, planned: 3 },
    activities: { logged: 1, planned: 2 },
    weeks: [
      { startsOn: '2026-10-30', done: 900, planned: 0 },
      { startsOn: '2026-11-06', done: 700, planned: 300 },
    ],
    average: 900,
    verdict: {
      kind: VerdictKind.OnTrack,
      load: 1000,
      average: 900,
      sessionsDone: 2,
      sessionsPlanned: 3,
    },
    weighIn: { latest: { date: '2026-10-31', weightKg: 72.5 }, due: true },
    ...overrides,
  };
}
