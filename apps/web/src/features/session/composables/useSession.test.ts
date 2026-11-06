import { AppError, AppErrorCode, RequestType } from '@stamina/app-core';
import type { LogSet } from '@stamina/contracts';
import { SessionSlot } from '@stamina/domain';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RoutePath } from '../../../enums/route-path.ts';
import { SessionMessageKey } from '../enums/session-message-key.ts';
import { SessionPhase } from '../enums/session-phase.ts';
import { SessionSheet } from '../enums/session-sheet.ts';
import { SetSaveStatus } from '../enums/set-save-status.ts';
import { SwapKind } from '../enums/swap-kind.ts';
import { QUEUED, REJECTED } from '../testing/create-mock-mediator.ts';
import { makeLoggedSet, makeSessionDetail } from '../testing/make-session-detail.ts';
import { setupSession } from '../testing/setup-session.ts';
import { SWAP_STORAGE_PREFIX } from '../config.ts';

type Setup = ReturnType<typeof setupSession>;

async function opened(options: Parameters<typeof setupSession>[0] = {}) {
  const setup = setupSession(options);
  await setup.flow.load();
  return setup;
}

/** Logs the next set and, if a rest started, skips it. */
async function logSet({ flow }: Setup) {
  await flow.logCurrentSet();
  flow.skipRest();
}

/** The standard Session has 1 + 3 + 2 planned sets. */
async function logEverything(setup: Setup) {
  for (let set = 0; set < 6; set++) await logSet(setup);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('opening a Session', () => {
  it('starts at the first exercise, with the steppers at their defaults, and keeps the screen awake', async () => {
    const { flow, keepAwake } = await opened();

    expect(flow.phase.value).toBe(SessionPhase.Focus);
    expect(flow.focus.value).toMatchObject({
      slot: SessionSlot.WarmUp,
      position: 1,
      total: 3,
      name: 'Leg swings',
      setNumber: 1,
    });
    expect(flow.draft.value).toEqual({ weightKg: 0, reps: 10, rpe: 6 });
    expect(keepAwake).toHaveBeenCalledTimes(1);
  });

  it('lets go of the screen and the rest timer when closed', async () => {
    const { flow, release } = await opened();

    flow.close();

    expect(release).toHaveBeenCalledTimes(1);
  });

  it('starts at the suggested weight, as the last Session earned it', async () => {
    const base = makeSessionDetail();
    const detail = makeSessionDetail({
      exercises: [
        base.exercises[0]!,
        { ...base.exercises[1]!, suggestedWeightKg: 42.5 },
        base.exercises[2]!,
      ],
    });
    const { flow } = await opened({ detail });

    flow.jumpTo(1);

    expect(flow.draft.value.weightKg).toBe(42.5);
  });

  it('explains a Session that was never opened without a signal, and can try again', async () => {
    const setup = setupSession();
    setup.state.loadError = new AppError(AppErrorCode.Offline);

    await setup.flow.load();

    expect(setup.flow.phase.value).toBe(SessionPhase.Failed);
    expect(setup.flow.messageKey.value).toBe(SessionMessageKey.Offline);
    expect(setup.keepAwake).not.toHaveBeenCalled();

    setup.state.loadError = undefined;
    await setup.flow.load();
    expect(setup.flow.phase.value).toBe(SessionPhase.Focus);
  });

  it('sends a signed-out person back to the start', async () => {
    const setup = setupSession();
    setup.state.loadError = new AppError(AppErrorCode.Unauthorized);

    await setup.flow.load();

    expect(setup.onNavigate).toHaveBeenCalledWith(RoutePath.Start);
  });
});

describe('logging a set', () => {
  it('sends the set with a new id, the exercise, the set number and the steppers values', async () => {
    const setup = await opened();
    await setup.flow.logCurrentSet(); // warm-up
    setup.flow.draft.value = { weightKg: 22.5, reps: 5, rpe: 8 };

    await setup.flow.logCurrentSet();

    const [warmUp, main] = setup.sets as [LogSet, LogSet];
    expect(warmUp).toMatchObject({ exerciseId: 'leg-swings', setNumber: 1 });
    expect(main).toEqual({
      id: expect.stringMatching(UUID),
      exerciseId: 'goblet-squat',
      setNumber: 1,
      weightKg: 22.5,
      reps: 5,
      rpe: 8,
    });
    expect(main.id).not.toBe(warmUp.id);
    expect(setup.requests.map(({ type }) => type)).toContain(RequestType.LogSet);
  });

  it('shows the set and moves on at once, without waiting for the network', async () => {
    const setup = await opened();
    await setup.flow.logCurrentSet(); // warm-up
    let open: () => void = () => undefined;
    setup.state.gate = new Promise<void>((resolve) => (open = resolve));

    const sending = setup.flow.logCurrentSet();

    expect(setup.flow.focus.value).toMatchObject({
      name: 'Goblet squat',
      doneSets: 1,
      setNumber: 2,
    });
    expect(setup.flow.setStatus.value).toBeUndefined();
    open();
    await sending;
    expect(setup.flow.setStatus.value).toMatchObject({ setNumber: 1, status: SetSaveStatus.Saved });
  });

  it('carries the weight just logged into the next set, and the top of the range for reps', async () => {
    const setup = await opened();
    await logSet(setup); // warm-up
    setup.flow.draft.value = { weightKg: 25, reps: 4, rpe: 9 };

    await logSet(setup);

    expect(setup.flow.draft.value).toEqual({ weightKg: 25, reps: 6, rpe: 9 });
  });

  it('says a set is saved on the device only when it waited for a connection', async () => {
    const setup = await opened();
    setup.state.logOutcome = QUEUED;

    await setup.flow.logCurrentSet();

    expect(setup.flow.setStatus.value?.status).toBe(SetSaveStatus.Queued);
    expect(setup.flow.focus.value?.doneSets).toBe(0); // moved to the next exercise already
    expect(setup.flow.focus.value?.name).toBe('Goblet squat');
  });

  it('keeps the set and says it was not sent when sending failed for another reason', async () => {
    const setup = await opened();
    setup.state.logOutcome = new AppError(AppErrorCode.Unknown);

    await setup.flow.logCurrentSet();

    expect(setup.flow.setStatus.value?.status).toBe(SetSaveStatus.NotSent);
    expect(setup.flow.focus.value?.position).toBe(2);
  });

  it('takes a refused set off the screen again and says so', async () => {
    const setup = await opened();
    setup.state.logOutcome = REJECTED;

    await setup.flow.logCurrentSet();

    expect(setup.flow.errorKey.value).toBe(SessionMessageKey.SetRejected);
    expect(setup.flow.phase.value).toBe(SessionPhase.Focus);
    expect(setup.flow.focus.value).toMatchObject({ name: 'Leg swings', doneSets: 0, setNumber: 1 });
  });

  it('shows only the latest set status when answers arrive late', async () => {
    const setup = await opened();
    let open: () => void = () => undefined;
    setup.state.gate = new Promise<void>((resolve) => (open = resolve));
    const first = setup.flow.logCurrentSet();
    setup.state.gate = undefined;
    setup.state.logOutcome = QUEUED;
    await setup.flow.logCurrentSet();

    open();
    await first;

    expect(setup.flow.setStatus.value).toMatchObject({
      setNumber: 1,
      status: SetSaveStatus.Queued,
    });
    expect(setup.sets).toHaveLength(2);
  });

  it('sends a signed-out person back to the start', async () => {
    const setup = await opened();
    setup.state.logOutcome = new AppError(AppErrorCode.Unauthorized);

    await setup.flow.logCurrentSet();

    expect(setup.onNavigate).toHaveBeenCalledWith(RoutePath.Start);
  });
});

describe('sets beyond the plan', () => {
  it('keeps the steppers behind "Add a set" once the planned sets are done', async () => {
    const setup = await opened();
    await logSet(setup); // warm-up: 1 of 1
    setup.flow.jumpTo(0);

    expect(setup.flow.focus.value).toMatchObject({ showSteppers: false, setNumber: 2 });
    await setup.flow.logCurrentSet();
    expect(setup.sets).toHaveLength(1);

    setup.flow.addSet();
    expect(setup.flow.focus.value?.showSteppers).toBe(true);
    await setup.flow.logCurrentSet();

    expect(setup.sets[1]).toMatchObject({ exerciseId: 'leg-swings', setNumber: 2 });
  });

  it('refuses a set beyond the limit', async () => {
    const detail = makeSessionDetail();
    const full = makeSessionDetail({
      exercises: [
        {
          ...detail.exercises[0]!,
          loggedSets: Array.from({ length: 20 }, (_, index) =>
            makeLoggedSet({ exerciseId: 'leg-swings', setNumber: index + 1 }),
          ),
        },
        ...detail.exercises.slice(1),
      ],
    });
    const setup = await opened({ detail: full });
    setup.flow.jumpTo(0);

    setup.flow.addSet();
    await setup.flow.logCurrentSet();

    expect(setup.flow.focus.value?.canAddSet).toBe(false);
    expect(setup.sets).toEqual([]);
  });
});

describe('the rest timer', () => {
  it('starts after a main-strength set with what comes next, and counts down', async () => {
    const setup = await opened();
    await logSet(setup); // warm-up

    await setup.flow.logCurrentSet();

    expect(setup.flow.restView.value).toEqual({
      remainingSeconds: 120,
      totalSeconds: 120,
      next: { name: 'Goblet squat', setNumber: 2 },
    });
    vi.advanceTimersByTime(5000);
    expect(setup.flow.restView.value?.remainingSeconds).toBe(115);
  });

  it('rests 60 s after an accessory and 90 s after sport support', async () => {
    const setup = await opened();
    setup.flow.jumpTo(2);

    await setup.flow.logCurrentSet();

    expect(setup.flow.restView.value?.totalSeconds).toBe(60);
  });

  it('names the next exercise when the last planned set of one is done', async () => {
    const setup = await opened();
    await logSet(setup);
    await logSet(setup);
    await logSet(setup);

    await setup.flow.logCurrentSet(); // third and last main-strength set

    expect(setup.flow.restView.value?.next).toEqual({ name: 'Plank', setNumber: 1 });
    expect(setup.flow.focus.value?.name).toBe('Plank');
  });

  it('has no rest after a warm-up set', async () => {
    const setup = await opened();

    await setup.flow.logCurrentSet();

    expect(setup.flow.restView.value).toBeUndefined();
    expect(setup.flow.focus.value?.name).toBe('Goblet squat');
  });

  it('has no rest after the Session final set, which goes to the finish question', async () => {
    const setup = await opened();
    for (let set = 0; set < 5; set++) await logSet(setup);

    await setup.flow.logCurrentSet();

    expect(setup.flow.restView.value).toBeUndefined();
    expect(setup.flow.phase.value).toBe(SessionPhase.Finish);
  });

  it('ends when it runs out, and when skipped', async () => {
    const setup = await opened();
    await logSet(setup);
    await setup.flow.logCurrentSet();

    vi.advanceTimersByTime(120_000);
    expect(setup.flow.restView.value).toBeUndefined();

    await setup.flow.logCurrentSet();
    expect(setup.flow.restView.value).toBeDefined();
    setup.flow.skipRest();
    expect(setup.flow.restView.value).toBeUndefined();
  });

  it('adds 15 seconds on request', async () => {
    const setup = await opened();
    await logSet(setup);
    await setup.flow.logCurrentSet();

    setup.flow.addRestTime();

    expect(setup.flow.restView.value).toMatchObject({ remainingSeconds: 135, totalSeconds: 135 });
  });

  it('stops when the screen is closed', async () => {
    const setup = await opened();
    await logSet(setup);
    await setup.flow.logCurrentSet();

    setup.flow.close();

    expect(setup.flow.restView.value).toBeUndefined();
  });
});

describe('resuming', () => {
  it('opens at the first exercise and set not logged yet', async () => {
    const base = makeSessionDetail();
    const detail = makeSessionDetail({
      exercises: [
        {
          ...base.exercises[0]!,
          loggedSets: [makeLoggedSet({ exerciseId: 'leg-swings', setNumber: 1 })],
        },
        {
          ...base.exercises[1]!,
          loggedSets: [
            makeLoggedSet({ setNumber: 1, weightKg: 30 }),
            makeLoggedSet({ setNumber: 2, weightKg: 32.5 }),
          ],
        },
        base.exercises[2]!,
      ],
    });

    const { flow } = await opened({ detail });

    expect(flow.phase.value).toBe(SessionPhase.Focus);
    expect(flow.focus.value).toMatchObject({ name: 'Goblet squat', setNumber: 3, doneSets: 2 });
    expect(flow.draft.value.weightKg).toBe(32.5);
  });

  it('opens a Session whose planned sets are all logged at the finish question', async () => {
    const base = makeSessionDetail();
    const detail = makeSessionDetail({
      exercises: base.exercises.map((exercise) => ({
        ...exercise,
        loggedSets: Array.from({ length: exercise.sets }, (_, index) =>
          makeLoggedSet({ exerciseId: exercise.exerciseId, setNumber: index + 1 }),
        ),
      })),
    });

    const { flow } = await opened({ detail });

    expect(flow.phase.value).toBe(SessionPhase.Finish);
  });

  it('opens a finished Session read-only on the done screen, without keeping the screen awake', async () => {
    const detail = makeSessionDetail({
      finished: {
        id: '00000000-0000-4000-8000-0000000000aa',
        rpe: 7,
        minutes: 50,
        load: 350,
        finishedAt: '2026-11-06T10:00:00.000Z',
      },
    });

    const { flow, keepAwake } = await opened({ detail });

    expect(flow.phase.value).toBe(SessionPhase.Done);
    expect(flow.finished.value).toEqual({ load: 350, rpe: 7, minutes: 50, queued: false });
    expect(keepAwake).not.toHaveBeenCalled();
  });
});

describe('swapping an exercise', () => {
  async function onMain(options: Parameters<typeof setupSession>[0] = {}) {
    const setup = await opened(options);
    setup.flow.jumpTo(1);
    return setup;
  }

  it('lists the easier and harder variants', async () => {
    const { flow } = await onMain();

    expect(flow.swapOptions.value.map(({ kind, name }) => [kind, name])).toEqual([
      [SwapKind.Easier, 'Box squat'],
      [SwapKind.Harder, 'Front squat'],
    ]);
  });

  it('logs the rest of the Session on the variant', async () => {
    const setup = await onMain();
    setup.flow.openSwap();
    expect(setup.flow.sheet.value).toBe(SessionSheet.Swap);

    setup.flow.swapTo(setup.flow.swapOptions.value[0]!);
    await setup.flow.logCurrentSet();
    setup.flow.skipRest();
    await setup.flow.logCurrentSet();

    expect(setup.flow.sheet.value).toBe(SessionSheet.None);
    expect(setup.sets.map(({ exerciseId, setNumber }) => [exerciseId, setNumber])).toEqual([
      ['box-squat', 1],
      ['box-squat', 2],
    ]);
    expect(setup.flow.focus.value).toMatchObject({ name: 'Box squat', doneSets: 2, setNumber: 3 });
  });

  it('shows the variant name and keeps the planned target', async () => {
    const setup = await onMain();

    setup.flow.swapTo(setup.flow.swapOptions.value[1]!);

    expect(setup.flow.focus.value).toMatchObject({
      name: 'Front squat',
      swapped: true,
      plannedSets: 3,
    });
    expect(setup.flow.focus.value?.target.prescription.params).toEqual({ sets: 3, range: '4-6' });
  });

  it('offers a way back to the planned exercise', async () => {
    const setup = await onMain();
    setup.flow.swapTo(setup.flow.swapOptions.value[0]!);

    const original = setup.flow.swapOptions.value.find(({ kind }) => kind === SwapKind.Original)!;
    setup.flow.swapTo(original);
    await setup.flow.logCurrentSet();

    expect(setup.sets[0]).toMatchObject({ exerciseId: 'goblet-squat' });
    expect(setup.storage.size).toBe(0);
  });

  it('keeps the choice for a reload during the Session and drops it when the Session finishes', async () => {
    const detail = makeSessionDetail();
    const first = await onMain({ detail });
    first.flow.swapTo(first.flow.swapOptions.value[0]!);
    const key = `${SWAP_STORAGE_PREFIX}${detail.id}`;
    expect(first.storage.has(key)).toBe(true);

    const reloaded = await opened({ detail, storage: Object.fromEntries(first.storage) });
    reloaded.flow.jumpTo(1);
    expect(reloaded.flow.focus.value).toMatchObject({ name: 'Box squat', swapped: true });

    reloaded.flow.showFinish();
    reloaded.flow.finishRpe.value = 7;
    await reloaded.flow.submitFinish();
    expect(reloaded.storage.has(key)).toBe(false);
  });
});

describe('the overview', () => {
  it('lists every exercise with its sets done, and jumps to the one tapped', async () => {
    const setup = await opened();
    await logSet(setup);
    await logSet(setup);
    setup.flow.showOverview();

    expect(setup.flow.phase.value).toBe(SessionPhase.Overview);
    expect(
      setup.flow.overview.value.map((row) => [row.name, row.doneSets, row.plannedSets]),
    ).toEqual([
      ['Leg swings', 1, 1],
      ['Goblet squat', 1, 3],
      ['Plank', 0, 2],
    ]);

    setup.flow.jumpTo(2);

    expect(setup.flow.phase.value).toBe(SessionPhase.Focus);
    expect(setup.flow.focus.value?.name).toBe('Plank');
  });
});

describe('finishing', () => {
  it('asks the session RPE after the last planned set, with the planned minutes to start from', async () => {
    const setup = await opened();
    await logEverything(setup);

    expect(setup.flow.phase.value).toBe(SessionPhase.Finish);
    expect(setup.flow.finishMinutes.value).toBe(45);
    expect(setup.flow.finishRpe.value).toBeUndefined();
  });

  it('does not finish until the RPE is chosen', async () => {
    const setup = await opened();
    await logEverything(setup);

    await setup.flow.submitFinish();

    expect(setup.finishes).toEqual([]);
    expect(setup.flow.phase.value).toBe(SessionPhase.Finish);
  });

  it('records the finish with a new id and shows the Load, RPE times minutes', async () => {
    const setup = await opened();
    await logEverything(setup);
    setup.flow.finishRpe.value = 7;
    setup.flow.finishMinutes.value = 50;

    await setup.flow.submitFinish();

    expect(setup.finishes).toEqual([{ id: expect.stringMatching(UUID), rpe: 7, minutes: 50 }]);
    expect(setup.flow.phase.value).toBe(SessionPhase.Done);
    expect(setup.flow.finished.value).toEqual({ load: 350, rpe: 7, minutes: 50, queued: false });
    expect(setup.release).toHaveBeenCalledTimes(1);
  });

  it('works offline: the finish waits to sync and the Load is still shown', async () => {
    const setup = await opened();
    await logEverything(setup);
    setup.state.finishOutcome = QUEUED;
    setup.flow.finishRpe.value = 8;

    await setup.flow.submitFinish();

    expect(setup.flow.phase.value).toBe(SessionPhase.Done);
    expect(setup.flow.finished.value).toEqual({ load: 360, rpe: 8, minutes: 45, queued: true });
  });

  it('stays on the question with a message when the finish fails, and can be tried again', async () => {
    const setup = await opened();
    await logEverything(setup);
    setup.state.finishOutcome = new AppError(AppErrorCode.Unknown);
    setup.flow.finishRpe.value = 6;

    await setup.flow.submitFinish();

    expect(setup.flow.phase.value).toBe(SessionPhase.Finish);
    expect(setup.flow.errorKey.value).toBe(SessionMessageKey.FinishFailed);
    expect(setup.flow.submitting.value).toBe(false);

    setup.state.finishOutcome = undefined;
    await setup.flow.submitFinish();
    expect(setup.flow.phase.value).toBe(SessionPhase.Done);
    expect(setup.flow.errorKey.value).toBeUndefined();
  });

  it('finishing early from the overview asks first, with the sets left', async () => {
    const setup = await opened();
    await logSet(setup);

    setup.flow.requestFinish();

    expect(setup.flow.sheet.value).toBe(SessionSheet.ConfirmFinish);
    expect(setup.flow.setsLeft.value).toBe(5);
    expect(setup.flow.phase.value).toBe(SessionPhase.Focus);

    setup.flow.showFinish();
    expect(setup.flow.sheet.value).toBe(SessionSheet.None);
    expect(setup.flow.phase.value).toBe(SessionPhase.Finish);
  });

  it('goes straight to the question when no planned set is left', async () => {
    const setup = await opened();
    await logEverything(setup);
    setup.flow.showFocus();

    setup.flow.requestFinish();

    expect(setup.flow.sheet.value).toBe(SessionSheet.None);
    expect(setup.flow.phase.value).toBe(SessionPhase.Finish);
  });

  it('can step back from the question to add a set', async () => {
    const setup = await opened();
    await logEverything(setup);

    setup.flow.showFocus();
    setup.flow.addSet();
    await setup.flow.logCurrentSet();

    expect(setup.sets.at(-1)).toMatchObject({ exerciseId: 'plank', setNumber: 3 });
    expect(setup.flow.phase.value).toBe(SessionPhase.Finish);
  });
});
