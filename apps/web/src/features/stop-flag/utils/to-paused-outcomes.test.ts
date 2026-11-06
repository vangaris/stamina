import { EMERGENCY_NUMBER, StopFlag } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { StopOutcomeKind } from '../enums/stop-outcome-kind.ts';
import { toPausedOutcomes } from './to-paused-outcomes.ts';

describe('toPausedOutcomes', () => {
  it('is empty when nothing pauses training', () => {
    expect(toPausedOutcomes([])).toEqual([]);
  });

  it('gives one message for flags that share it, in the order they were reported', () => {
    const outcomes = toPausedOutcomes([StopFlag.HeadKnock, StopFlag.ChestPain, StopFlag.Fainting]);

    expect(outcomes.map(({ kind }) => kind)).toEqual([
      StopOutcomeKind.PausedCleared,
      StopOutcomeKind.PausedDoctor,
    ]);
  });

  it('carries the emergency number for the cardiac group only', () => {
    const [cleared, doctor] = toPausedOutcomes([StopFlag.HeadKnock, StopFlag.Heartbeat]);

    expect(cleared?.emergencyNumber).toBeUndefined();
    expect(doctor?.emergencyNumber).toBe(EMERGENCY_NUMBER);
  });

  it('carries the emergency number when any flag of a kind shows it, whichever came first', () => {
    const [outcome] = toPausedOutcomes([StopFlag.HeadKnock, StopFlag.HeadKnock]);
    const merged = toPausedOutcomes([StopFlag.Heartbeat, StopFlag.ChestPain]);

    expect(outcome?.emergencyNumber).toBeUndefined();
    expect(merged).toHaveLength(1);
    expect(merged[0]?.emergencyNumber).toBe(EMERGENCY_NUMBER);
  });
});
