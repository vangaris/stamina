import { AppError, AppErrorCode, RequestType, SafetyStatus } from '@stamina/app-core';
import { RecordStatus, ScreeningRejection } from '@stamina/contracts';
import { ScreeningQuestion, ScreeningStatus, StopFlag, TrainingMode } from '@stamina/domain';
import { describe, expect, it, vi } from 'vitest';
import { RoutePath } from '../../../enums/route-path.ts';
import { SafetyPhase } from '../../safety/index.ts';
import { PausedStep } from '../enums/paused-step.ts';
import { StopFlagMessageKey } from '../enums/stop-flag-message-key.ts';
import { StopOutcomeKind } from '../enums/stop-outcome-kind.ts';
import { createMemoryStorage } from '../testing/create-memory-storage.ts';
import { createMockMediator } from '../testing/create-mock-mediator.ts';
import { makeScreening, makeStop } from '../testing/make-safety-state.ts';
import { createRecheckOwedStore } from '../utils/create-recheck-owed-store.ts';
import { usePaused } from './usePaused.ts';

function setup(pausing: StopFlag[] = [StopFlag.ChestPain], owed: StopFlag[] = []) {
  const mock = createMockMediator();
  mock.state.safety = {
    status: SafetyStatus.Paused,
    screening: makeScreening(),
    stop: makeStop({ pausing }),
  };
  const onNavigate = vi.fn();
  const recheckOwed = createRecheckOwedStore(createMemoryStorage());
  for (const flag of owed) recheckOwed.owe(flag);
  const flow = usePaused({ mediator: mock.mediator, onNavigate, recheckOwed });
  return { flow, onNavigate, recheckOwed, ...mock };
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

  it('says a doctor has seen the person, or has cleared them when only a head knock pauses', async () => {
    const cardiac = setup([StopFlag.Fainting]);
    const head = setup([StopFlag.HeadKnock]);
    const mixed = setup([StopFlag.HeadKnock, StopFlag.Fainting]);

    await cardiac.flow.load();
    await head.flow.load();
    await mixed.flow.load();

    expect(cardiac.flow.confirmCopy.value.label).toBe(StopFlagMessageKey.PausedConfirm);
    expect(head.flow.confirmCopy.value.label).toBe(StopFlagMessageKey.PausedConfirmCleared);
    expect(mixed.flow.confirmCopy.value.label).toBe(StopFlagMessageKey.PausedConfirm);
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

  it('names the flags the person saw when it confirms', async () => {
    const { flow, confirmations } = setup([StopFlag.Fainting, StopFlag.HeadKnock]);
    await flow.load();

    await flow.confirm();

    expect(confirmations).toEqual([[StopFlag.Fainting, StopFlag.HeadKnock]]);
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

describe('the questions a report owes', () => {
  async function confirmed(pausing: StopFlag[], owed: StopFlag[]) {
    const setUp = setup(pausing, owed);
    await setUp.flow.load();
    await setUp.flow.confirm();
    return setUp;
  }

  it('asks them after the pause is confirmed, before the person goes on', async () => {
    const { flow, onNavigate, requests } = await confirmed(
      [StopFlag.ChestPain, StopFlag.HeadKnock],
      [StopFlag.ChestPain, StopFlag.Heartbeat, StopFlag.HeadKnock],
    );

    expect(flow.step.value).toBe(PausedStep.Recheck);
    // The union of what the owed flags ask, each question once; a flag that is not paused asks nothing.
    expect(flow.questions.value).toEqual([
      ScreeningQuestion.HeartCondition,
      ScreeningQuestion.ChestPain,
      ScreeningQuestion.HeadInjury,
    ]);
    expect(onNavigate).not.toHaveBeenCalled();
    expect(requests.map(({ type }) => type)).toEqual([
      RequestType.GetSafety,
      RequestType.ConfirmDoctorSeen,
    ]);
    expect(flow.busy.value).toBe(false);
  });

  it('does not ask a flag that is not among those the person confirmed', async () => {
    const { flow, onNavigate } = await confirmed([StopFlag.Fainting], [StopFlag.HeadKnock]);

    expect(flow.step.value).toBe(PausedStep.Confirm);
    expect(onNavigate).toHaveBeenCalledWith(RoutePath.Today);
  });

  it('sends only those answers, settles what was owed and goes to Today', async () => {
    const { flow, onNavigate, rechecks, recheckOwed, requests } = await confirmed(
      [StopFlag.HeadKnock],
      [StopFlag.HeadKnock, StopFlag.ChestPain],
    );
    flow.answer(ScreeningQuestion.HeadInjury, false);

    await flow.submitRecheck();

    expect(rechecks).toEqual([{ answers: { [ScreeningQuestion.HeadInjury]: false } }]);
    expect(recheckOwed.owed()).toEqual([StopFlag.ChestPain]);
    expect(requests.map(({ type }) => type)).toEqual([
      RequestType.GetSafety,
      RequestType.ConfirmDoctorSeen,
      RequestType.RecheckScreening,
      RequestType.GetSafety,
    ]);
    expect(onNavigate).toHaveBeenCalledWith(RoutePath.Today);
  });

  it('does not send while a question is unanswered', async () => {
    const { flow, rechecks, onNavigate } = await confirmed(
      [StopFlag.HeadKnock],
      [StopFlag.HeadKnock],
    );

    await flow.submitRecheck();

    expect(rechecks).toEqual([]);
    expect(flow.errors.value.answers).toEqual({
      [ScreeningQuestion.HeadInjury]: StopFlagMessageKey.AnswerRequired,
    });
    expect(flow.step.value).toBe(PausedStep.Recheck);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('routes to Referred when the new answers refer the person', async () => {
    const { flow, state, onNavigate } = setup([StopFlag.HeadKnock], [StopFlag.HeadKnock]);
    state.recheck = {
      status: RecordStatus.Saved,
      screening: makeScreening({
        status: ScreeningStatus.Referred,
        trainingMode: TrainingMode.Referred,
      }),
      goalChanged: false,
    };
    await flow.load();
    await flow.confirm();
    flow.answer(ScreeningQuestion.HeadInjury, true);

    await flow.submitRecheck();

    expect(onNavigate).toHaveBeenCalledOnce();
    expect(onNavigate).toHaveBeenCalledWith(RoutePath.Referred);
  });

  it('settles what was owed when a rule refuses the answers', async () => {
    const { flow, state, onNavigate, recheckOwed } = setup(
      [StopFlag.HeadKnock],
      [StopFlag.HeadKnock],
    );
    state.recheck = { status: RecordStatus.Rejected, reason: ScreeningRejection.NoScreening };
    await flow.load();
    await flow.confirm();
    flow.answer(ScreeningQuestion.HeadInjury, false);

    await flow.submitRecheck();

    expect(recheckOwed.owed()).toEqual([]);
    expect(onNavigate).toHaveBeenCalledWith(RoutePath.Screening);
  });

  it('keeps them owed and stays on the questions when they could not be sent', async () => {
    const { flow, state, onNavigate, recheckOwed } = setup(
      [StopFlag.HeadKnock],
      [StopFlag.HeadKnock],
    );
    state.recheck = new AppError(AppErrorCode.Offline);
    await flow.load();
    await flow.confirm();
    flow.answer(ScreeningQuestion.HeadInjury, false);

    await flow.submitRecheck();

    expect(flow.recheckErrorKey.value).toBe(StopFlagMessageKey.RecheckOffline);
    expect(flow.step.value).toBe(PausedStep.Recheck);
    expect(recheckOwed.owed()).toEqual([StopFlag.HeadKnock]);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('ignores a submit before the pause was confirmed', async () => {
    const { flow, rechecks } = setup([StopFlag.HeadKnock], [StopFlag.HeadKnock]);
    await flow.load();

    await flow.submitRecheck();

    expect(rechecks).toEqual([]);
  });
});
