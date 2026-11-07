import { AppError, AppErrorCode, RequestType } from '@stamina/app-core';
import { describe, expect, it } from 'vitest';
import { RoutePath } from '../../../enums/route-path.ts';
import { CheckinMessageKey } from '../enums/checkin-message-key.ts';
import { CheckinQuestionKey } from '../enums/checkin-question-key.ts';
import { CheckinStatus } from '../enums/checkin-status.ts';
import { makeCheckin, QUEUED } from '../testing/create-mock-mediator.ts';
import { setupCheckin } from '../testing/setup-checkin.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

async function loaded(setup = setupCheckin()) {
  await setup.flow.load();
  return setup;
}

async function answerAll(flow: ReturnType<typeof setupCheckin>['flow'], scores = [4, 2, 3]) {
  for (const score of scores) await flow.answer(score);
}

describe('loading', () => {
  it('asks the questions, sleep first, when there is no Check-in yet', async () => {
    const { flow } = await loaded();

    expect(flow.status.value).toBe(CheckinStatus.Asking);
    expect(flow.asking.value).toBe(true);
    expect(flow.question.value).toBe(CheckinQuestionKey.Sleep);
    expect(flow.position.value).toBe(1);
  });

  it('asks the questions when the latest Check-in is from an earlier day', async () => {
    const setup = setupCheckin();
    setup.state.latest = makeCheckin({ date: '2026-11-05' });

    const { flow } = await loaded(setup);

    expect(flow.status.value).toBe(CheckinStatus.Asking);
  });

  it("shows the done card with the answers when today's Check-in is in", async () => {
    const setup = setupCheckin();
    setup.state.latest = makeCheckin({ date: '2026-11-06', sleep: 5, soreness: 1, energy: 2 });

    const { flow, checkins } = await loaded(setup);

    expect(flow.status.value).toBe(CheckinStatus.Answered);
    expect(flow.done.value).toBe(true);
    expect(flow.asking.value).toBe(false);
    expect(flow.sent.value).toEqual({ sleep: 5, soreness: 1, energy: 2 });
    expect(flow.messageKey.value).toBe(CheckinMessageKey.Saved);
    expect(checkins).toHaveLength(0);
  });

  it('asks the questions when the latest Check-in cannot be read', async () => {
    const setup = setupCheckin();
    setup.state.latestError = new AppError(AppErrorCode.Offline);

    const { flow, onNavigate } = await loaded(setup);

    expect(flow.status.value).toBe(CheckinStatus.Asking);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('sends a signed-out person to sign in', async () => {
    const setup = setupCheckin();
    setup.state.latestError = new AppError(AppErrorCode.Unauthorized);

    await loaded(setup);

    expect(setup.onNavigate).toHaveBeenCalledWith(RoutePath.Start);
  });
});

describe('answering', () => {
  it('moves on one question per tap and sends nothing before the third answer', async () => {
    const { flow, checkins } = await loaded();

    await flow.answer(4);
    expect(flow.question.value).toBe(CheckinQuestionKey.Soreness);
    expect(flow.position.value).toBe(2);
    await flow.answer(2);

    expect(flow.question.value).toBe(CheckinQuestionKey.Energy);
    expect(flow.position.value).toBe(3);
    expect(checkins).toHaveLength(0);
  });

  it("sends one Check-in with an id made here and today's date on the third answer", async () => {
    const { flow, checkins, requests } = await loaded();

    await answerAll(flow, [4, 2, 3]);

    expect(checkins).toHaveLength(1);
    expect(checkins[0]).toEqual({
      id: expect.stringMatching(UUID),
      date: '2026-11-06',
      sleep: 4,
      soreness: 2,
      energy: 3,
    });
    expect(requests.map((request) => request.type)).toEqual([
      RequestType.GetLatestCheckin,
      RequestType.SubmitCheckin,
    ]);
    expect(flow.status.value).toBe(CheckinStatus.Saved);
    expect(flow.messageKey.value).toBe(CheckinMessageKey.Saved);
    expect(flow.sent.value).toEqual({ sleep: 4, soreness: 2, energy: 3 });
    expect(flow.done.value).toBe(true);
  });

  it('sends once when the third answer is tapped twice quickly', async () => {
    const setup = await loaded();
    const { flow, checkins } = setup;
    let release!: () => void;
    setup.state.gate = new Promise<void>((resolve) => (release = resolve));
    await flow.answer(4);
    await flow.answer(2);

    const first = flow.answer(3);
    const second = flow.answer(5);
    release();
    await Promise.all([first, second]);

    expect(checkins).toHaveLength(1);
    expect(checkins[0]?.energy).toBe(3);
  });

  it('ignores answers once the Check-in is in', async () => {
    const { flow, checkins } = await loaded();
    await answerAll(flow);

    await flow.answer(1);

    expect(checkins).toHaveLength(1);
    expect(flow.sent.value).toEqual({ sleep: 4, soreness: 2, energy: 3 });
  });

  it('shows the Check-in as saved on the phone when there is no signal', async () => {
    const setup = await loaded();
    setup.state.submitOutcome = QUEUED;

    await answerAll(setup.flow);

    expect(setup.flow.status.value).toBe(CheckinStatus.Queued);
    expect(setup.flow.messageKey.value).toBe(CheckinMessageKey.Queued);
    expect(setup.flow.sent.value).toEqual({ sleep: 4, soreness: 2, energy: 3 });
    expect(setup.flow.done.value).toBe(true);
  });

  it('keeps the answers with a message when sending fails, and retries with the same id', async () => {
    const setup = await loaded();
    const { flow, checkins } = setup;
    setup.state.submitOutcome = new AppError(AppErrorCode.Unknown);

    await answerAll(flow);

    expect(flow.status.value).toBe(CheckinStatus.Failed);
    expect(flow.errorKey.value).toBe(CheckinMessageKey.Failed);
    expect(flow.asking.value).toBe(true);
    expect(flow.selected.value).toBe(3);

    setup.state.submitOutcome = undefined;
    await flow.retry();

    expect(checkins).toHaveLength(2);
    expect(checkins[1]).toEqual(checkins[0]);
    expect(flow.status.value).toBe(CheckinStatus.Saved);
    expect(flow.errorKey.value).toBeUndefined();
  });

  it('makes a new id for a Check-in whose answer changed after a failed try', async () => {
    const setup = await loaded();
    const { flow, checkins } = setup;
    setup.state.submitOutcome = new AppError(AppErrorCode.Unknown);
    await answerAll(flow);
    setup.state.submitOutcome = undefined;

    await flow.answer(5);

    expect(checkins).toHaveLength(2);
    expect(checkins[1]?.energy).toBe(5);
    expect(checkins[1]?.id).not.toBe(checkins[0]?.id);
  });

  it('sends a signed-out person to sign in', async () => {
    const setup = await loaded();
    setup.state.submitOutcome = new AppError(AppErrorCode.Unauthorized);

    await answerAll(setup.flow);

    expect(setup.onNavigate).toHaveBeenCalledWith(RoutePath.Start);
  });
});

describe('going back', () => {
  it('cannot go back from the first question', async () => {
    const { flow } = await loaded();

    expect(flow.canGoBack.value).toBe(false);
    flow.back();
    expect(flow.question.value).toBe(CheckinQuestionKey.Sleep);
  });

  it('shows the answer given and lets the person change it before anything is sent', async () => {
    const { flow, checkins } = await loaded();
    await flow.answer(4);
    await flow.answer(2);

    flow.back();
    expect(flow.question.value).toBe(CheckinQuestionKey.Soreness);
    expect(flow.selected.value).toBe(2);
    await flow.answer(1);
    await flow.answer(5);

    expect(checkins).toHaveLength(1);
    expect(checkins[0]).toMatchObject({ sleep: 4, soreness: 1, energy: 5 });
  });

  it('goes back from a failed send to change an earlier answer', async () => {
    const setup = await loaded();
    setup.state.submitOutcome = new AppError(AppErrorCode.Unknown);
    await answerAll(setup.flow);

    setup.flow.back();

    expect(setup.flow.status.value).toBe(CheckinStatus.Asking);
    expect(setup.flow.errorKey.value).toBeUndefined();
    expect(setup.flow.question.value).toBe(CheckinQuestionKey.Soreness);
  });

  it('cannot go back while the answers are being sent', async () => {
    const setup = await loaded();
    setup.state.gate = new Promise<void>(() => undefined);
    await setup.flow.answer(4);
    await setup.flow.answer(2);
    void setup.flow.answer(3);

    expect(setup.flow.sending.value).toBe(true);
    expect(setup.flow.canGoBack.value).toBe(false);
    setup.flow.back();
    expect(setup.flow.question.value).toBe(CheckinQuestionKey.Energy);
  });
});

describe('anything unusual', () => {
  it('opens the reporter, and closes the row once something was reported', async () => {
    const { flow } = await loaded();
    await answerAll(flow);

    flow.openUnusual();
    expect(flow.unusualOpen.value).toBe(true);
    expect(flow.unusualDone.value).toBe(false);
    flow.reportedUnusual();

    expect(flow.unusualOpen.value).toBe(false);
    expect(flow.unusualDone.value).toBe(true);
  });

  it('finishes the row when nothing is unusual, without opening the reporter', async () => {
    const { flow } = await loaded();
    await answerAll(flow);

    flow.nothingUnusual();

    expect(flow.unusualOpen.value).toBe(false);
    expect(flow.unusualDone.value).toBe(true);
  });
});
