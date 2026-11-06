import { AppError, AppErrorCode } from '@stamina/app-core';
import { RecordStatus, ScreeningRejection } from '@stamina/contracts';
import {
  BodyArea,
  EMERGENCY_NUMBER,
  ScreeningQuestion,
  StopFlag,
  ScreeningStatus,
  TrainingMode,
  stopFlagEffect,
} from '@stamina/domain';
import { describe, expect, it, vi } from 'vitest';
import { RoutePath } from '../../../enums/route-path.ts';
import { ReportStatus } from '../enums/report-status.ts';
import { StopFlagMessageKey } from '../enums/stop-flag-message-key.ts';
import { StopFlagStep } from '../enums/stop-flag-step.ts';
import { StopFlagStorageKey } from '../enums/stop-flag-storage-key.ts';
import { StopOutcomeKind } from '../enums/stop-outcome-kind.ts';
import { createMemoryStorage } from '../testing/create-memory-storage.ts';
import { createMockMediator, QUEUED } from '../testing/create-mock-mediator.ts';
import { makeScreening } from '../testing/make-safety-state.ts';
import { createRecheckOwedStore } from '../utils/create-recheck-owed-store.ts';
import { useStopFlag } from './useStopFlag.ts';

const REPORT_ID = '0f8f3a52-6f0e-4c53-9d3e-2f3a6a9b7c11';
const SESSION_ID = '5b0c6d0e-47f2-4a6b-b6f4-0f2f6f1c9a22';
const NOW = new Date(2026, 10, 6, 18, 30);

function setup({ sessionId }: { sessionId?: string } = {}) {
  const mock = createMockMediator();
  const onNavigate = vi.fn();
  const onDone = vi.fn();
  const storage = createMemoryStorage();
  const recheckOwed = createRecheckOwedStore(storage);
  const flow = useStopFlag({
    mediator: mock.mediator,
    onNavigate,
    onDone,
    newId: () => REPORT_ID,
    now: () => NOW,
    recheckOwed,
    ...(sessionId ? { sessionId: () => sessionId } : {}),
  });
  return { flow, onNavigate, onDone, recheckOwed, storage, ...mock };
}

describe('reporting a stop flag', () => {
  it('sends one report with an id made on the device and shows the emergency number at once', async () => {
    const { flow, reports, state } = setup();
    let release = () => {};
    state.gate = new Promise<void>((resolve) => (release = resolve));

    const picking = flow.pick(StopFlag.ChestPain);

    // The network has not answered, yet the person is already told to stop.
    expect(flow.step.value).toBe(StopFlagStep.Outcome);
    expect(flow.outcome.value).toEqual({
      kind: StopOutcomeKind.PausedDoctor,
      area: undefined,
      emergencyNumber: EMERGENCY_NUMBER,
    });
    expect(flow.reportStatus.value).toBe(ReportStatus.Sending);
    release();
    await picking;

    expect(reports).toEqual([{ id: REPORT_ID, flag: StopFlag.ChestPain, date: '2026-11-06' }]);
    expect(flow.reportStatus.value).toBe(ReportStatus.Saved);
  });

  it('sends once however many times the option is tapped', async () => {
    const { flow, reports } = setup();

    await Promise.all([flow.pick(StopFlag.Fainting), flow.pick(StopFlag.Fainting)]);

    expect(reports).toHaveLength(1);
  });

  it('shows the same outcome when the report was only queued on the phone', async () => {
    const { flow, state } = setup();
    state.report = QUEUED;

    await flow.pick(StopFlag.Heartbeat);

    expect(flow.outcome.value?.emergencyNumber).toBe(EMERGENCY_NUMBER);
    expect(flow.reportStatus.value).toBe(ReportStatus.Queued);
    expect(flow.reportKey.value).toBe(StopFlagMessageKey.ReportQueued);
    expect(flow.canContinue.value).toBe(true);
  });

  it('shows the outcome even when the request fails offline, and sends the same id on a retry', async () => {
    const { flow, state, reports } = setup();
    state.report = new AppError(AppErrorCode.Offline);

    await flow.pick(StopFlag.Breathlessness);

    expect(flow.outcome.value?.emergencyNumber).toBe(EMERGENCY_NUMBER);
    expect(flow.reportStatus.value).toBe(ReportStatus.Failed);
    expect(flow.reportKey.value).toBe(StopFlagMessageKey.ReportFailed);
    // A failed report is not left behind: the person cannot move on until it is saved.
    expect(flow.canContinue.value).toBe(false);

    state.report = undefined;
    await flow.retry();

    expect(reports.map(({ id }) => id)).toEqual([REPORT_ID, REPORT_ID]);
    expect(flow.reportStatus.value).toBe(ReportStatus.Saved);
    expect(flow.canContinue.value).toBe(true);
  });

  it('sends an unauthorized person to the start', async () => {
    const { flow, state, onNavigate } = setup();
    state.report = new AppError(AppErrorCode.Unauthorized);

    await flow.pick(StopFlag.Fever);

    expect(onNavigate).toHaveBeenCalledWith(RoutePath.Start);
  });

  it('names the Session the report was made in', async () => {
    const { flow, reports } = setup({ sessionId: SESSION_ID });

    await flow.pick(StopFlag.Fainting);

    expect(reports[0]?.sessionId).toBe(SESSION_ID);
  });
});

describe('new pain', () => {
  it('asks for the area first and sends nothing until it is picked', async () => {
    const { flow, reports } = setup();

    await flow.pick(StopFlag.NewPain);

    expect(flow.step.value).toBe(StopFlagStep.Area);
    expect(reports).toEqual([]);

    await flow.pickArea(BodyArea.Knee);

    expect(reports).toEqual([
      { id: REPORT_ID, flag: StopFlag.NewPain, date: '2026-11-06', bodyArea: BodyArea.Knee },
    ]);
    expect(flow.outcome.value).toEqual({
      kind: StopOutcomeKind.AreaExcluded,
      area: BodyArea.Knee,
      emergencyNumber: undefined,
    });
  });

  it('goes back from the area to the list', async () => {
    const { flow } = setup();
    await flow.pick(StopFlag.NewPain);

    flow.back();

    expect(flow.step.value).toBe(StopFlagStep.Options);
    expect(flow.flag.value).toBeUndefined();
  });

  it('ignores an area picked before new pain', async () => {
    const { flow, reports } = setup();

    await flow.pickArea(BodyArea.Hip);

    expect(reports).toEqual([]);
  });
});

describe('the other outcomes', () => {
  it('makes a fever a rest day, with nothing to ask again', async () => {
    const { flow, onNavigate, onDone } = setup();

    await flow.pick(StopFlag.Fever);

    expect(flow.outcome.value?.kind).toBe(StopOutcomeKind.Rest);
    expect(flow.questions.value).toEqual([]);

    flow.continueFromOutcome();

    expect(onDone).toHaveBeenCalledOnce();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('pauses until cleared after a head knock, and asks the head question again', async () => {
    const { flow } = setup();

    await flow.pick(StopFlag.HeadKnock);

    expect(flow.outcome.value?.kind).toBe(StopOutcomeKind.PausedCleared);
    expect(flow.outcome.value?.emergencyNumber).toBeUndefined();
    expect(flow.questions.value).toEqual([ScreeningQuestion.HeadInjury]);
  });

  it('leaves a Session for Today after a rest-day report', async () => {
    const { flow, onNavigate, onDone } = setup({ sessionId: SESSION_ID });
    await flow.pick(StopFlag.Fever);

    flow.continueFromOutcome();

    expect(onNavigate).toHaveBeenCalledWith(RoutePath.Today);
    expect(onDone).toHaveBeenCalledOnce();
  });
});

describe('asking the Screening questions again', () => {
  it.each(Object.values(StopFlag).filter((flag) => flag !== StopFlag.Fever))(
    'lists exactly the questions %s asks again',
    async (flag) => {
      const { flow } = setup();
      if (flag === StopFlag.NewPain) {
        await flow.pick(flag);
        await flow.pickArea(BodyArea.Knee);
      } else await flow.pick(flag);

      flow.continueFromOutcome();

      expect(flow.step.value).toBe(StopFlagStep.Recheck);
      expect(flow.questions.value).toEqual(stopFlagEffect(flag).recheck);
    },
  );

  it('does not move on until the report is saved', async () => {
    const { flow, state } = setup();
    state.report = new AppError(AppErrorCode.Offline);
    await flow.pick(StopFlag.ChestPain);

    flow.continueFromOutcome();

    expect(flow.step.value).toBe(StopFlagStep.Outcome);
  });

  it('sends only those answers, then takes a paused person to the paused screen', async () => {
    const { flow, rechecks, onNavigate, onDone } = setup();
    await flow.pick(StopFlag.ChestPain);
    flow.continueFromOutcome();

    flow.answer(ScreeningQuestion.HeartCondition, false);
    await flow.submitRecheck();

    // One question is still unanswered: nothing is sent.
    expect(rechecks).toEqual([]);
    expect(flow.errors.value.answers).toEqual({
      [ScreeningQuestion.ChestPain]: StopFlagMessageKey.AnswerRequired,
    });

    flow.answer(ScreeningQuestion.ChestPain, true);
    await flow.submitRecheck();

    expect(rechecks).toEqual([
      {
        answers: {
          [ScreeningQuestion.HeartCondition]: false,
          [ScreeningQuestion.ChestPain]: true,
        },
      },
    ]);
    expect(onNavigate).toHaveBeenCalledWith(RoutePath.Paused);
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('sends a person the new Screening refers to the Referred screen', async () => {
    const { flow, state, onNavigate } = setup();
    state.recheck = {
      status: RecordStatus.Saved,
      screening: makeScreening({
        status: ScreeningStatus.Referred,
        trainingMode: TrainingMode.Referred,
      }),
      goalChanged: false,
    };
    await flow.pick(StopFlag.Fainting);
    flow.continueFromOutcome();
    flow.answer(ScreeningQuestion.Fainting, true);

    await flow.submitRecheck();

    expect(onNavigate).toHaveBeenCalledOnce();
    expect(onNavigate).toHaveBeenCalledWith(RoutePath.Referred);
  });

  it('sends a person with no earlier Screening to the Screening', async () => {
    const { flow, state, onNavigate } = setup();
    state.recheck = { status: RecordStatus.Rejected, reason: ScreeningRejection.NoScreening };
    await flow.pick(StopFlag.Fainting);
    flow.continueFromOutcome();
    flow.answer(ScreeningQuestion.Fainting, false);

    await flow.submitRecheck();

    expect(onNavigate).toHaveBeenCalledWith(RoutePath.Screening);
  });

  it('shows the offline message, and stays on the questions, when there is no signal', async () => {
    const { flow, state, onNavigate, onDone } = setup();
    state.recheck = new AppError(AppErrorCode.Offline);
    await flow.pick(StopFlag.Fainting);
    flow.continueFromOutcome();
    flow.answer(ScreeningQuestion.Fainting, false);

    await flow.submitRecheck();

    expect(flow.errorKey.value).toBe(StopFlagMessageKey.RecheckOffline);
    expect(flow.step.value).toBe(StopFlagStep.Recheck);
    expect(flow.busy.value).toBe(false);
    expect(onNavigate).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('asks for an area with a yes to the bone, joint and muscle question, starting from the reported one', async () => {
    const { flow, rechecks } = setup();
    await flow.pick(StopFlag.NewPain);
    await flow.pickArea(BodyArea.Knee);
    flow.continueFromOutcome();
    flow.answer(ScreeningQuestion.BoneJointMuscle, true);
    flow.setBodyAreas([]);

    await flow.submitRecheck();

    expect(rechecks).toEqual([]);
    expect(flow.errors.value.bodyAreas).toBe(StopFlagMessageKey.AreasRequired);

    flow.setBodyAreas([BodyArea.Knee, BodyArea.Hip]);
    await flow.submitRecheck();

    expect(rechecks).toEqual([
      {
        answers: { [ScreeningQuestion.BoneJointMuscle]: true },
        bodyAreas: [BodyArea.Knee, BodyArea.Hip],
      },
    ]);
  });

  it('starts the area picker with the area that was reported', async () => {
    const { flow } = setup();
    await flow.pick(StopFlag.NewPain);
    await flow.pickArea(BodyArea.Ankle);

    flow.continueFromOutcome();

    expect(flow.draft.value.bodyAreas).toEqual([BodyArea.Ankle]);
  });
});

describe('closing the sheet', () => {
  it('still takes a person who was told training is paused to the paused screen', async () => {
    const { flow, onNavigate, onDone } = setup();
    await flow.pick(StopFlag.ChestPain);

    flow.dismiss();

    expect(onNavigate).toHaveBeenCalledWith(RoutePath.Paused);
    expect(onDone).toHaveBeenCalledOnce();
    expect(flow.step.value).toBe(StopFlagStep.Options);
  });

  it('only starts over when nothing was picked', () => {
    const { flow, onNavigate, onDone } = setup();

    flow.dismiss();

    expect(onNavigate).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('makes a new report, with a new id, the next time it is opened', async () => {
    const mock = createMockMediator();
    const ids = ['id-one', 'id-two'];
    const flow = useStopFlag({
      mediator: mock.mediator,
      onNavigate: vi.fn(),
      onDone: vi.fn(),
      newId: () => ids.shift() ?? 'none',
      now: () => NOW,
      recheckOwed: createRecheckOwedStore(createMemoryStorage()),
    });
    await flow.pick(StopFlag.Fever);
    flow.dismiss();

    flow.reset();
    await flow.pick(StopFlag.Fever);

    expect(mock.reports.map(({ id }) => id)).toEqual(['id-one', 'id-two']);
  });
});

describe('the questions a report owes', () => {
  it('notes them on the phone once a report that asks questions is saved, or queued', async () => {
    const saved = setup();
    const queued = setup();
    queued.state.report = QUEUED;

    await saved.flow.pick(StopFlag.ChestPain);
    await queued.flow.pick(StopFlag.HeadKnock);

    expect(saved.recheckOwed.owed()).toEqual([StopFlag.ChestPain]);
    expect(queued.recheckOwed.owed()).toEqual([StopFlag.HeadKnock]);
  });

  it('notes nothing for a report that asks nothing, or one that did not get through', async () => {
    const fever = setup();
    const failed = setup();
    failed.state.report = new AppError(AppErrorCode.Offline);

    await fever.flow.pick(StopFlag.Fever);
    await failed.flow.pick(StopFlag.ChestPain);

    expect(fever.storage.data.has(StopFlagStorageKey.RecheckOwed)).toBe(false);
    expect(failed.storage.data.has(StopFlagStorageKey.RecheckOwed)).toBe(false);
  });

  it('keeps them owed when the sheet is closed before the questions are answered', async () => {
    const { flow, recheckOwed } = setup();
    await flow.pick(StopFlag.ChestPain);
    flow.continueFromOutcome();

    flow.dismiss();

    expect(recheckOwed.owed()).toEqual([StopFlag.ChestPain]);
  });

  it('settles them when the server saves the answers, whatever the new Screening says', async () => {
    const { flow, state, recheckOwed } = setup();
    state.recheck = {
      status: RecordStatus.Saved,
      screening: makeScreening({
        status: ScreeningStatus.Referred,
        trainingMode: TrainingMode.Referred,
      }),
      goalChanged: false,
    };
    await flow.pick(StopFlag.Fainting);
    flow.continueFromOutcome();
    flow.answer(ScreeningQuestion.Fainting, true);

    await flow.submitRecheck();

    expect(recheckOwed.owed()).toEqual([]);
  });

  it('settles them when the server refuses the answers by a rule', async () => {
    const { flow, state, recheckOwed } = setup();
    state.recheck = { status: RecordStatus.Rejected, reason: ScreeningRejection.NoScreening };
    await flow.pick(StopFlag.Fainting);
    flow.continueFromOutcome();
    flow.answer(ScreeningQuestion.Fainting, false);

    await flow.submitRecheck();

    expect(recheckOwed.owed()).toEqual([]);
  });

  it('keeps them owed when the answers could not be sent', async () => {
    const { flow, state, recheckOwed } = setup();
    state.recheck = new AppError(AppErrorCode.Offline);
    await flow.pick(StopFlag.Fainting);
    flow.continueFromOutcome();
    flow.answer(ScreeningQuestion.Fainting, false);

    await flow.submitRecheck();

    expect(recheckOwed.owed()).toEqual([StopFlag.Fainting]);
  });

  it('settles only the flag whose questions were answered', async () => {
    const { flow, recheckOwed } = setup();
    recheckOwed.owe(StopFlag.HeadKnock);
    await flow.pick(StopFlag.Fainting);
    flow.continueFromOutcome();
    flow.answer(ScreeningQuestion.Fainting, false);

    await flow.submitRecheck();

    expect(recheckOwed.owed()).toEqual([StopFlag.HeadKnock]);
  });
});
