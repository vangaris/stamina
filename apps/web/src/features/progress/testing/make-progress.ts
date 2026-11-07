import type { Progress } from '@stamina/contracts';
import { VerdictKind } from '@stamina/domain';

/** A week that is going as usual: four past weeks, this one last, a weigh-in due. */
export function makeProgress(overrides: Partial<Progress> = {}): Progress {
  return {
    weekStartsOn: '2026-11-03',
    sessions: { done: 1, planned: 3 },
    activities: { logged: 1, planned: 2 },
    weeks: [
      { startsOn: '2026-10-13', done: 1500, planned: 0 },
      { startsOn: '2026-10-20', done: 1700, planned: 0 },
      { startsOn: '2026-10-27', done: 1600, planned: 0 },
      { startsOn: '2026-11-03', done: 900, planned: 800 },
    ],
    average: 1600,
    verdict: {
      kind: VerdictKind.OnTrack,
      load: 900,
      average: 1600,
      sessionsDone: 1,
      sessionsPlanned: 3,
    },
    weighIn: { latest: null, due: true },
    ...overrides,
  };
}
