import { describe, expect, it } from 'vitest';
import { StopOutcomeKind } from '../enums/stop-outcome-kind.ts';
import type { StopOutcomeView } from '../types.ts';
import { toPausedConfirmCopy } from './to-paused-confirm-copy.ts';

const view = (kind: StopOutcomeKind): StopOutcomeView => ({
  kind,
  area: undefined,
  emergencyNumber: undefined,
});

describe('toPausedConfirmCopy', () => {
  it('says a doctor has seen the person for a pause that needs a doctor', () => {
    expect(toPausedConfirmCopy([view(StopOutcomeKind.PausedDoctor)])).toEqual({
      label: 'stopFlag.paused.confirm',
      hint: 'stopFlag.paused.hint',
    });
  });

  it('says a doctor has cleared the person when every pause is one a doctor clears', () => {
    expect(toPausedConfirmCopy([view(StopOutcomeKind.PausedCleared)])).toEqual({
      label: 'stopFlag.paused.confirmCleared',
      hint: 'stopFlag.paused.hintCleared',
    });
  });

  it('keeps "seen" when a pause that needs a doctor is among them', () => {
    const copy = toPausedConfirmCopy([
      view(StopOutcomeKind.PausedCleared),
      view(StopOutcomeKind.PausedDoctor),
    ]);

    expect(copy.label).toBe('stopFlag.paused.confirm');
  });

  it('falls back to "seen" when nothing is shown', () => {
    expect(toPausedConfirmCopy([]).label).toBe('stopFlag.paused.confirm');
  });
});
