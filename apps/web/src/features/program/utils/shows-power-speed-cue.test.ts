import { Emphasis } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { SessionBlockKind } from '../enums/session-block-kind.ts';
import { showsPowerSpeedCue } from './shows-power-speed-cue.ts';

describe('showsPowerSpeedCue', () => {
  it('shows beside main strength in a power and speed Block', () => {
    expect(showsPowerSpeedCue(SessionBlockKind.MainStrength, Emphasis.PowerSpeed)).toBe(true);
  });

  it('does not show for other emphases', () => {
    expect(showsPowerSpeedCue(SessionBlockKind.MainStrength, Emphasis.Strength)).toBe(false);
  });

  it('does not show beside other blocks', () => {
    expect(showsPowerSpeedCue(SessionBlockKind.WarmUp, Emphasis.PowerSpeed)).toBe(false);
  });
});
