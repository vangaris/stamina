import { describe, expect, it } from 'vitest';
import { StopFlag } from '../enums/stop-flag.ts';
import { isTrainingBlocked } from './is-training-blocked.ts';

const clear = { pausing: [], restOn: null, excludedAreas: [] };

describe('isTrainingBlocked', () => {
  it('allows training with no pause and no rest day', () => {
    expect(isTrainingBlocked(clear, '2026-11-08')).toBe(false);
  });

  it('blocks every day while a flag pauses training', () => {
    const paused = { ...clear, pausing: [StopFlag.Heartbeat] };
    expect(isTrainingBlocked(paused, '2026-11-08')).toBe(true);
    expect(isTrainingBlocked(paused, '2026-12-25')).toBe(true);
  });

  it('blocks only the fever day', () => {
    const rest = { ...clear, restOn: '2026-11-08' };
    expect(isTrainingBlocked(rest, '2026-11-08')).toBe(true);
    expect(isTrainingBlocked(rest, '2026-11-09')).toBe(false);
  });
});
