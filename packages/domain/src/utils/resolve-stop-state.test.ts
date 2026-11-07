import { describe, expect, it } from 'vitest';
import { BodyArea } from '../enums/body-area.ts';
import { StopFlag } from '../enums/stop-flag.ts';
import type { StoredStopFlag } from '../types.ts';
import { resolveStopState } from './resolve-stop-state.ts';

const flag = (overrides: Partial<StoredStopFlag>): StoredStopFlag => ({
  flag: StopFlag.ChestPain,
  date: '2026-11-08',
  area: null,
  reportedAt: '2026-11-08T10:00:00.000Z',
  confirmedAt: null,
  ...overrides,
});

describe('resolveStopState', () => {
  it('has no pause, rest or exclusion without flags', () => {
    expect(resolveStopState([])).toEqual({ pausing: [], restOn: null, excludedAreas: [] });
  });

  it('pauses on a cardiac or head flag until it is confirmed, and lists each flag once', () => {
    const open = resolveStopState([
      flag({ flag: StopFlag.Fainting }),
      flag({ flag: StopFlag.HeadKnock }),
      flag({ flag: StopFlag.Fainting }),
    ]);
    expect(open.pausing).toEqual([StopFlag.Fainting, StopFlag.HeadKnock]);

    const confirmed = resolveStopState([
      flag({ flag: StopFlag.Fainting, confirmedAt: '2026-11-09T09:00:00.000Z' }),
    ]);
    expect(confirmed.pausing).toEqual([]);
  });

  it('rests on the day of the latest fever and does not pause', () => {
    const state = resolveStopState([
      flag({ flag: StopFlag.Fever, date: '2026-11-08' }),
      flag({ flag: StopFlag.Fever, date: '2026-11-10' }),
      flag({ flag: StopFlag.Fever, date: '2026-11-09' }),
    ]);
    expect(state).toEqual({ pausing: [], restOn: '2026-11-10', excludedAreas: [] });
  });

  it('excludes the area of each new pain once, and keeps it after later flags', () => {
    const state = resolveStopState([
      flag({ flag: StopFlag.NewPain, area: BodyArea.Knee }),
      flag({ flag: StopFlag.NewPain, area: BodyArea.Knee }),
      flag({ flag: StopFlag.NewPain, area: BodyArea.Shoulder }),
      flag({ flag: StopFlag.Fever }),
    ]);
    expect(state.excludedAreas).toEqual([BodyArea.Knee, BodyArea.Shoulder]);
    expect(state.pausing).toEqual([]);
  });
});
