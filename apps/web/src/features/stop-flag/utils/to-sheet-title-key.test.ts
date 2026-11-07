import { describe, expect, it } from 'vitest';
import { StopFlagStep } from '../enums/stop-flag-step.ts';
import { StopOutcomeKind } from '../enums/stop-outcome-kind.ts';
import { toSheetTitleKey } from './to-sheet-title-key.ts';

describe('toSheetTitleKey', () => {
  it('titles the list, the area and the repeated questions by their step', () => {
    expect(toSheetTitleKey(StopFlagStep.Options, undefined)).toBe('stopFlag.title');
    expect(toSheetTitleKey(StopFlagStep.Area, undefined)).toBe('stopFlag.area.title');
    expect(toSheetTitleKey(StopFlagStep.Recheck, StopOutcomeKind.Rest)).toBe(
      'stopFlag.recheck.title',
    );
  });

  it('titles the outcome by what it says', () => {
    expect(toSheetTitleKey(StopFlagStep.Outcome, StopOutcomeKind.PausedDoctor)).toBe(
      'stopFlag.outcome.paused-doctor.title',
    );
  });
});
