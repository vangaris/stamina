import { AppError, AppErrorCode, RequestType, SafetyStatus } from '@stamina/app-core';
import { StopFlag } from '@stamina/domain';
import { describe, expect, it, vi } from 'vitest';
import { RoutePath } from '../../../enums/route-path.ts';
import { SafetyPhase } from '../../safety/index.ts';
import { StopFlagMessageKey } from '../enums/stop-flag-message-key.ts';
import { StopOutcomeKind } from '../enums/stop-outcome-kind.ts';
import { createMockMediator } from '../testing/create-mock-mediator.ts';
import { makeScreening, makeStop } from '../testing/make-safety-state.ts';
import { usePaused } from './usePaused.ts';

function setup(pausing: StopFlag[] = [StopFlag.ChestPain]) {
  const mock = createMockMediator();
  mock.state.safety = {
    status: SafetyStatus.Paused,
    screening: makeScreening(),
    stop: makeStop({ pausing }),
  };
  const onNavigate = vi.fn();
  const flow = usePaused({ mediator: mock.mediator, onNavigate });
  return { flow, onNavigate, ...mock };
}

describe('the paused screen', () => {
  it('shows what pauses training once for each kind of pause', async () => {
    const { flow } = setup([StopFlag.ChestPain, StopFlag.Fainting, StopFlag.HeadKnock]);

    await flow.load();

    expect(flow.phase.value).toBe(SafetyPhase.Ready);
    expect(flow.outcomes.value.map(({ kind }) => kind)).toEqual([
      StopOutcomeKind.PausedDoctor,
      StopOutcomeKind.PausedCleared,
    ]);
  });

  it('sends a person who is not paused to the screen they belong on', async () => {
    const { flow, onNavigate, state } = setup();
    state.safety = { status: SafetyStatus.Ready, screening: makeScreening(), stop: makeStop() };

    await flow.load();

    expect(onNavigate).toHaveBeenCalledWith(RoutePath.Today);
  });

  it('confirms a doctor has seen the person, asks where they stand again and goes to Today', async () => {
    const { flow, onNavigate, requests } = setup();
    await flow.load();

    await flow.confirm();

    expect(requests.map(({ type }) => type)).toEqual([
      RequestType.GetSafety,
      RequestType.ConfirmDoctorSeen,
      RequestType.GetSafety,
    ]);
    expect(onNavigate).toHaveBeenCalledWith(RoutePath.Today);
    expect(flow.busy.value).toBe(false);
  });

  it('says reports are still saving on the phone, and stays paused', async () => {
    const { flow, onNavigate, state } = setup();
    state.confirm = new AppError(AppErrorCode.UnsyncedData);
    await flow.load();

    await flow.confirm();

    expect(flow.errorKey.value).toBe(StopFlagMessageKey.PausedStillSaving);
    expect(onNavigate).not.toHaveBeenCalled();
    expect(flow.outcomes.value).not.toEqual([]);
  });

  it('says it needs a connection when offline', async () => {
    const { flow, state } = setup();
    state.confirm = new AppError(AppErrorCode.Offline);
    await flow.load();

    await flow.confirm();

    expect(flow.errorKey.value).toBe(StopFlagMessageKey.PausedOffline);
  });

  it('falls back to a general message for anything else', async () => {
    const { flow, state } = setup();
    state.confirm = new Error('boom');
    await flow.load();

    await flow.confirm();

    expect(flow.errorKey.value).toBe(StopFlagMessageKey.PausedUnknown);
  });

  it('sends a signed-out person to the start', async () => {
    const { flow, onNavigate, state } = setup();
    state.confirm = new AppError(AppErrorCode.Unauthorized);
    await flow.load();

    await flow.confirm();

    expect(onNavigate).toHaveBeenCalledWith(RoutePath.Start);
  });
});
