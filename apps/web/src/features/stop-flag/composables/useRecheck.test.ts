import { AppError, AppErrorCode } from '@stamina/app-core';
import { RecordStatus, ScreeningRejection } from '@stamina/contracts';
import { BodyArea, ScreeningQuestion, ScreeningStatus, TrainingMode } from '@stamina/domain';
import { describe, expect, it, vi } from 'vitest';
import { RoutePath } from '../../../enums/route-path.ts';
import { StopFlagMessageKey } from '../enums/stop-flag-message-key.ts';
import { createMockMediator } from '../testing/create-mock-mediator.ts';
import { makeScreening } from '../testing/make-safety-state.ts';
import { useRecheck } from './useRecheck.ts';

const QUESTIONS = [ScreeningQuestion.Fainting];

function setup() {
  const mock = createMockMediator();
  const onSettled = vi.fn();
  const recheck = useRecheck({ mediator: mock.mediator, onSettled });
  return { recheck, onSettled, ...mock };
}

describe('useRecheck', () => {
  it('sends nothing while a question is unanswered', async () => {
    const { recheck, rechecks, onSettled } = setup();

    expect(await recheck.submit(QUESTIONS)).toBeUndefined();

    expect(rechecks).toEqual([]);
    expect(recheck.errors.value.answers).toEqual({
      [ScreeningQuestion.Fainting]: StopFlagMessageKey.AnswerRequired,
    });
    expect(onSettled).not.toHaveBeenCalled();
  });

  it('settles and carries on once the server takes the answers', async () => {
    const { recheck, onSettled } = setup();
    recheck.answer(ScreeningQuestion.Fainting, false);

    expect(await recheck.submit(QUESTIONS)).toEqual({ path: undefined });

    expect(onSettled).toHaveBeenCalledOnce();
    expect(recheck.busy.value).toBe(false);
  });

  it('settles and sends a Referred person to the Referred screen', async () => {
    const { recheck, state, onSettled } = setup();
    state.recheck = {
      status: RecordStatus.Saved,
      screening: makeScreening({
        status: ScreeningStatus.Referred,
        trainingMode: TrainingMode.Referred,
      }),
      goalChanged: false,
    };
    recheck.answer(ScreeningQuestion.Fainting, true);

    expect(await recheck.submit(QUESTIONS)).toEqual({ path: RoutePath.Referred });
    expect(onSettled).toHaveBeenCalledOnce();
  });

  it('settles when a rule refuses the answers, and names the step the person needs', async () => {
    const { recheck, state, onSettled } = setup();
    state.recheck = { status: RecordStatus.Rejected, reason: ScreeningRejection.ConsentMissing };
    recheck.answer(ScreeningQuestion.Fainting, false);

    expect(await recheck.submit(QUESTIONS)).toEqual({ path: RoutePath.Consent });
    expect(onSettled).toHaveBeenCalledOnce();
  });

  it('does not settle when the answers could not be sent', async () => {
    const { recheck, state, onSettled } = setup();
    state.recheck = new AppError(AppErrorCode.Offline);
    recheck.answer(ScreeningQuestion.Fainting, false);

    expect(await recheck.submit(QUESTIONS)).toBeUndefined();

    expect(recheck.errorKey.value).toBe(StopFlagMessageKey.RecheckOffline);
    expect(onSettled).not.toHaveBeenCalled();
    expect(recheck.busy.value).toBe(false);
  });

  it('sends a signed-out person to the start without settling', async () => {
    const { recheck, state, onSettled } = setup();
    state.recheck = new AppError(AppErrorCode.Unauthorized);
    recheck.answer(ScreeningQuestion.Fainting, false);

    expect(await recheck.submit(QUESTIONS)).toEqual({ path: RoutePath.Start });
    expect(onSettled).not.toHaveBeenCalled();
  });

  it('starts over with the given areas', () => {
    const { recheck } = setup();
    recheck.answer(ScreeningQuestion.Fainting, true);

    recheck.reset([BodyArea.Knee]);

    expect(recheck.draft.value.answers).toEqual({});
    expect(recheck.draft.value.bodyAreas).toEqual([BodyArea.Knee]);
  });
});
