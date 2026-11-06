import { describe, expect, it } from 'vitest';
import { RoutePath } from '../../../enums/route-path.ts';
import { StopOutcomeKind } from '../enums/stop-outcome-kind.ts';
import { toRouteAfterReport } from './to-route-after-report.ts';

describe('toRouteAfterReport', () => {
  it.each([StopOutcomeKind.PausedDoctor, StopOutcomeKind.PausedCleared])(
    'takes a paused person to the paused screen, in a Session or not (%s)',
    (kind) => {
      expect(toRouteAfterReport(kind, true)).toBe(RoutePath.Paused);
      expect(toRouteAfterReport(kind, false)).toBe(RoutePath.Paused);
    },
  );

  it.each([StopOutcomeKind.Rest, StopOutcomeKind.AreaExcluded])(
    'leaves the Session for Today and stays put outside one (%s)',
    (kind) => {
      expect(toRouteAfterReport(kind, true)).toBe(RoutePath.Today);
      expect(toRouteAfterReport(kind, false)).toBeUndefined();
    },
  );
});
