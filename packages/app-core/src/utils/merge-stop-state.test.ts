import { BodyArea, StopFlag, type StopState, type StoredStopFlag } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { mergeStopState } from './merge-stop-state.ts';

const NONE: StopState = { pausing: [], restOn: null, excludedAreas: [] };

const local = (flag: StopFlag, overrides: Partial<StoredStopFlag> = {}): StoredStopFlag => ({
  flag,
  date: '2026-11-06',
  area: null,
  reportedAt: '2026-11-06T09:00:00.000Z',
  confirmedAt: null,
  ...overrides,
});

describe('mergeStopState', () => {
  it('is the server state when nothing waits on the device', () => {
    const server: StopState = {
      pausing: [StopFlag.HeadKnock],
      restOn: '2026-11-01',
      excludedAreas: [BodyArea.Knee],
    };

    expect(mergeStopState(server, [])).toEqual(server);
  });

  it('adds a local cardiac flag as a pause', () => {
    expect(mergeStopState(NONE, [local(StopFlag.ChestPain)])).toEqual({
      pausing: [StopFlag.ChestPain],
      restOn: null,
      excludedAreas: [],
    });
  });

  it('unions pauses without repeating one, the server first', () => {
    const server: StopState = { ...NONE, pausing: [StopFlag.HeadKnock, StopFlag.Fainting] };

    const merged = mergeStopState(server, [local(StopFlag.Fainting), local(StopFlag.ChestPain)]);

    expect(merged.pausing).toEqual([StopFlag.HeadKnock, StopFlag.Fainting, StopFlag.ChestPain]);
  });

  it('keeps the later rest day', () => {
    const server: StopState = { ...NONE, restOn: '2026-11-04' };

    expect(mergeStopState(server, [local(StopFlag.Fever, { date: '2026-11-06' })]).restOn).toBe(
      '2026-11-06',
    );
    expect(
      mergeStopState({ ...NONE, restOn: '2026-11-09' }, [
        local(StopFlag.Fever, { date: '2026-11-06' }),
      ]).restOn,
    ).toBe('2026-11-09');
  });

  it('does not pause for a fever and rests that day', () => {
    expect(mergeStopState(NONE, [local(StopFlag.Fever)])).toEqual({
      pausing: [],
      restOn: '2026-11-06',
      excludedAreas: [],
    });
  });

  it('unions excluded areas', () => {
    const server: StopState = { ...NONE, excludedAreas: [BodyArea.Knee] };

    const merged = mergeStopState(server, [
      local(StopFlag.NewPain, { area: BodyArea.Knee }),
      local(StopFlag.NewPain, { area: BodyArea.Shoulder }),
    ]);

    expect(merged.excludedAreas).toEqual([BodyArea.Knee, BodyArea.Shoulder]);
  });

  it('changes neither input', () => {
    const server: StopState = { ...NONE, pausing: [StopFlag.HeadKnock] };
    const flags = [local(StopFlag.ChestPain)];

    mergeStopState(server, flags);

    expect(server.pausing).toEqual([StopFlag.HeadKnock]);
    expect(flags).toEqual([local(StopFlag.ChestPain)]);
  });
});
