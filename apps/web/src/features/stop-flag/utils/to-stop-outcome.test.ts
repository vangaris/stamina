import { BodyArea, EMERGENCY_NUMBER, StopFlag } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { StopOutcomeKind } from '../enums/stop-outcome-kind.ts';
import { toStopOutcome } from './to-stop-outcome.ts';

describe('toStopOutcome', () => {
  it.each([StopFlag.ChestPain, StopFlag.Fainting, StopFlag.Breathlessness, StopFlag.Heartbeat])(
    'pauses until a doctor has seen the person and shows the emergency number for %s',
    (flag) => {
      expect(toStopOutcome(flag)).toEqual({
        kind: StopOutcomeKind.PausedDoctor,
        area: undefined,
        emergencyNumber: EMERGENCY_NUMBER,
      });
    },
  );

  it('makes a fever a rest day, with no emergency number', () => {
    expect(toStopOutcome(StopFlag.Fever)).toEqual({
      kind: StopOutcomeKind.Rest,
      area: undefined,
      emergencyNumber: undefined,
    });
  });

  it('leaves the reported area out for new pain', () => {
    expect(toStopOutcome(StopFlag.NewPain, BodyArea.Knee)).toEqual({
      kind: StopOutcomeKind.AreaExcluded,
      area: BodyArea.Knee,
      emergencyNumber: undefined,
    });
  });

  it('pauses until cleared after a head knock', () => {
    expect(toStopOutcome(StopFlag.HeadKnock)).toEqual({
      kind: StopOutcomeKind.PausedCleared,
      area: undefined,
      emergencyNumber: undefined,
    });
  });

  it('ignores an area for a flag that has none', () => {
    expect(toStopOutcome(StopFlag.Fever, BodyArea.Knee).area).toBeUndefined();
  });
});
