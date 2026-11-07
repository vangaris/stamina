import { AppError, AppErrorCode, RequestType } from '@stamina/app-core';
import { AdaptationChangeKind } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { RoutePath } from '../../../enums/route-path.ts';
import { AdaptationCardState } from '../enums/adaptation-card-state.ts';
import { AdaptationLoadStatus } from '../enums/adaptation-load-status.ts';
import { AdaptationMessageKey } from '../enums/adaptation-message-key.ts';
import { ALREADY_DECIDED, QUEUED, STALE } from '../testing/create-mock-mediator.ts';
import { makeAdaptation } from '../testing/make-adaptation.ts';
import { setupAdaptations } from '../testing/setup-adaptations.ts';

async function loaded(...pending: ReturnType<typeof makeAdaptation>[]) {
  const setup = setupAdaptations(pending);
  await setup.flow.load();
  return setup;
}

const sentTypes = (requests: { type: string }[]) => requests.map(({ type }) => type);

describe('loading the suggestions', () => {
  it('shows a card per pending suggestion, with its change and its reason', async () => {
    const first = makeAdaptation();
    const second = makeAdaptation({
      change: { kind: AdaptationChangeKind.DeloadWeek, sessionIds: [first.id] },
    });

    const { flow } = await loaded(first, second);

    expect(flow.status.value).toBe(AdaptationLoadStatus.Ready);
    expect(flow.cards.value.map(({ id, state }) => ({ id, state }))).toEqual([
      { id: first.id, state: AdaptationCardState.Pending },
      { id: second.id, state: AdaptationCardState.Pending },
    ]);
    expect(flow.cards.value[0]?.change).toEqual({
      key: 'adaptation.change.move-session',
      params: { from: 'thu', to: 'fri' },
    });
    expect(flow.cards.value[0]?.reason.params).toEqual(first.params);
    expect(flow.cards.value[1]?.change.key).toBe('adaptation.change.deload-week');
  });

  it('shows no card, and no error, when the suggestions cannot be read', async () => {
    const setup = setupAdaptations([makeAdaptation()]);
    setup.state.listError = new AppError(AppErrorCode.Offline);

    await setup.flow.load();

    expect(setup.flow.status.value).toBe(AdaptationLoadStatus.Unavailable);
    expect(setup.flow.cards.value).toEqual([]);
    expect(setup.flow.noticeKey.value).toBeUndefined();
  });

  it('sends a signed-out person to the start', async () => {
    const setup = setupAdaptations();
    setup.state.listError = new AppError(AppErrorCode.Unauthorized);

    await setup.flow.load();

    expect(setup.onNavigate).toHaveBeenCalledWith(RoutePath.Start);
  });
});

describe('accepting', () => {
  it('sends the suggestion as the card showed it, then the card goes and the week is asked for again', async () => {
    const adaptation = makeAdaptation();
    const setup = await loaded(adaptation, makeAdaptation());

    await setup.flow.accept(adaptation.id);

    expect(setup.accepted).toEqual([adaptation]);
    expect(setup.flow.cards.value.map(({ id }) => id)).not.toContain(adaptation.id);
    expect(setup.flow.cards.value).toHaveLength(1);
    expect(setup.flow.noticeKey.value).toBeUndefined();
    expect(sentTypes(setup.requests).slice(-2).sort()).toEqual(
      [RequestType.GetAdaptations, RequestType.GetProgram].sort(),
    );
  });

  it('shows the card as decided, with no buttons to press again, when it was queued offline', async () => {
    const adaptation = makeAdaptation();
    const setup = await loaded(adaptation);
    setup.state.acceptOutcome = QUEUED;

    await setup.flow.accept(adaptation.id);

    expect(setup.flow.cards.value.map(({ state }) => state)).toEqual([AdaptationCardState.Queued]);
    await setup.flow.accept(adaptation.id);
    await setup.flow.decline(adaptation.id);
    expect(setup.accepted.length + setup.declined.length).toBe(1 + 0);
  });

  it('says the plan changed, drops the card and asks for the latest when it is stale', async () => {
    const adaptation = makeAdaptation();
    const setup = await loaded(adaptation);
    setup.state.acceptOutcome = STALE;
    setup.state.adaptations = [];

    await setup.flow.accept(adaptation.id);

    expect(setup.flow.noticeKey.value).toBe(AdaptationMessageKey.Stale);
    expect(setup.flow.cards.value).toEqual([]);
    expect(sentTypes(setup.requests)).toContain(RequestType.GetProgram);
    expect(
      sentTypes(setup.requests).filter((type) => type === RequestType.GetAdaptations),
    ).toHaveLength(2);
  });

  it('drops the card without a note when it was decided already', async () => {
    const adaptation = makeAdaptation();
    const setup = await loaded(adaptation);
    setup.state.acceptOutcome = ALREADY_DECIDED;

    await setup.flow.accept(adaptation.id);

    expect(setup.flow.cards.value).toEqual([]);
    expect(setup.flow.noticeKey.value).toBeUndefined();
  });

  it('keeps the card, ready for another try, when sending fails', async () => {
    const adaptation = makeAdaptation();
    const setup = await loaded(adaptation);
    setup.state.acceptOutcome = new Error('boom');

    await setup.flow.accept(adaptation.id);

    expect(setup.flow.noticeKey.value).toBe(AdaptationMessageKey.Failed);
    expect(setup.flow.cards.value.map(({ state }) => state)).toEqual([AdaptationCardState.Pending]);
  });

  it('sends a signed-out person to the start and keeps the card', async () => {
    const adaptation = makeAdaptation();
    const setup = await loaded(adaptation);
    setup.state.acceptOutcome = new AppError(AppErrorCode.Unauthorized);

    await setup.flow.accept(adaptation.id);

    expect(setup.onNavigate).toHaveBeenCalledWith(RoutePath.Start);
    expect(setup.flow.noticeKey.value).toBeUndefined();
    expect(setup.flow.cards.value).toHaveLength(1);
  });

  it('ignores an id that is not on screen', async () => {
    const setup = await loaded(makeAdaptation());

    await setup.flow.accept('no-such-id');

    expect(setup.accepted).toEqual([]);
  });
});

describe('declining', () => {
  it('sends the id and the card goes', async () => {
    const adaptation = makeAdaptation();
    const setup = await loaded(adaptation);

    await setup.flow.decline(adaptation.id);

    expect(setup.declined).toEqual([adaptation.id]);
    expect(setup.flow.cards.value).toEqual([]);
    expect(sentTypes(setup.requests)).not.toContain(RequestType.GetProgram);
  });

  it('shows the card as decided when it was queued offline', async () => {
    const adaptation = makeAdaptation();
    const setup = await loaded(adaptation);
    setup.state.declineOutcome = QUEUED;

    await setup.flow.decline(adaptation.id);

    expect(setup.flow.cards.value.map(({ state }) => state)).toEqual([AdaptationCardState.Queued]);
  });

  it('keeps the card when sending fails', async () => {
    const adaptation = makeAdaptation();
    const setup = await loaded(adaptation);
    setup.state.declineOutcome = new Error('boom');

    await setup.flow.decline(adaptation.id);

    expect(setup.flow.noticeKey.value).toBe(AdaptationMessageKey.Failed);
    expect(setup.flow.cards.value.map(({ state }) => state)).toEqual([AdaptationCardState.Pending]);
  });
});
