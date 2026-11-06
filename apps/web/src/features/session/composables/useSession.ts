import { AppError, AppErrorCode, finishSession, getSessionDetail, logSet } from '@stamina/app-core';
import { RecordStatus, type LogSet, type SessionDetail } from '@stamina/contracts';
import { MAX_LOGGED_SETS, MIN_SET_RPE, sessionLoad } from '@stamina/domain';
import { newId } from '@stamina/ids';
import { computed, ref, shallowRef } from 'vue';
import { useMediator } from '../../../mediator.ts';
import { toMessageKey } from '../../../utils/to-message-key.ts';
import { localizedName } from '../../program/index.ts';
import { LOAD_ERROR_KEYS, REST_ADD_SECONDS, ROUTE_WHEN_SIGNED_OUT } from '../config.ts';
import { SessionMessageKey } from '../enums/session-message-key.ts';
import { SessionPhase } from '../enums/session-phase.ts';
import { SessionSheet } from '../enums/session-sheet.ts';
import { SetSaveStatus } from '../enums/set-save-status.ts';
import type {
  FinishedView,
  NextSetView,
  SetDraft,
  SetStatus,
  SwapOption,
  Swaps,
  UseSessionOptions,
} from '../types.ts';
import { addLoggedSet } from '../utils/add-logged-set.ts';
import { buildExerciseViews } from '../utils/build-exercise-views.ts';
import { buildFocusModel } from '../utils/build-focus-model.ts';
import { buildOverviewRows } from '../utils/build-overview-rows.ts';
import { buildSwapOptions } from '../utils/build-swap-options.ts';
import { createSwapStore } from '../utils/create-swap-store.ts';
import { defaultSetDraft } from '../utils/default-set-draft.ts';
import { isQueued } from '../utils/is-queued.ts';
import { keepAwake } from '../utils/keep-awake.ts';
import { nextSetNumber } from '../utils/next-set-number.ts';
import { nextSetTarget } from '../utils/next-set-target.ts';
import { remainingSets } from '../utils/remaining-sets.ts';
import { removeLoggedSet } from '../utils/remove-logged-set.ts';
import { restSecondsFor } from '../utils/rest-seconds-for.ts';
import { withSwap } from '../utils/with-swap.ts';
import { useRestTimer } from './useRestTimer.ts';

/**
 * The Session screen: opens one Session (resuming at the first set not logged yet, or showing a
 * finished one), and walks it exercise by exercise. A set is added to the screen the moment it
 * is logged, then written on the device and sent through the mediator; the rest timer, swaps
 * and the finish follow from there. `load` also keeps the screen awake until `close`.
 */
export function useSession(options: UseSessionOptions) {
  const { sessionId, locale, onNavigate } = options;
  const mediator = options.mediator ?? useMediator();
  const swapStore = options.swapStore ?? createSwapStore(localStorage);
  const makeId = options.newId ?? newId;
  const startAwake = options.keepAwake ?? (() => keepAwake({ navigator, document }));

  const phase = ref(SessionPhase.Loading);
  const messageKey = ref<SessionMessageKey | undefined>();
  const detail = shallowRef<SessionDetail | undefined>();
  const swaps = ref<Swaps>({});
  const position = ref(0);
  const draft = ref<SetDraft>({ weightKg: 0, reps: 1, rpe: MIN_SET_RPE });
  const addingSet = ref(false);
  const sheet = ref(SessionSheet.None);
  const setStatus = ref<SetStatus | undefined>();
  const restNext = ref<NextSetView | undefined>();
  const finishRpe = ref<number | undefined>();
  const finishMinutes = ref(0);
  const finished = ref<FinishedView | undefined>();
  const submitting = ref(false);
  const errorKey = ref<SessionMessageKey | undefined>();
  let latestSetId: string | undefined;
  let stopAwake: (() => void) | undefined;

  const rest = useRestTimer({
    onEnd: () => {
      restNext.value = undefined;
    },
    ...(options.clock && { clock: options.clock }),
  });

  const views = computed(() => (detail.value ? buildExerciseViews(detail.value, swaps.value) : []));
  const focus = computed(() =>
    buildFocusModel({
      views: views.value,
      position: position.value,
      addingSet: addingSet.value,
      locale: locale(),
    }),
  );
  const overview = computed(() => buildOverviewRows(views.value, position.value, locale()));
  const swapOptions = computed(() => {
    const view = views.value[position.value];
    return view ? buildSwapOptions(view, locale()) : [];
  });
  /** Planned sets still to log, across the whole Session. */
  const setsLeft = computed(() => remainingSets(views.value));
  /** What the rest timer shows while a rest is running. */
  const restView = computed(() =>
    rest.active.value
      ? {
          remainingSeconds: rest.remaining.value,
          totalSeconds: rest.total.value,
          next: restNext.value,
        }
      : undefined,
  );

  function releaseAwake() {
    stopAwake?.();
    stopAwake = undefined;
  }

  function moveTo(index: number) {
    const view = views.value[index];
    if (!view) return;
    position.value = index;
    addingSet.value = false;
    draft.value = defaultSetDraft(view);
  }

  /** Back to the first set not logged yet; to the finish question when every planned set is. */
  function resume() {
    const target = nextSetTarget(views.value, 0);
    if (target) {
      moveTo(target.position);
      phase.value = SessionPhase.Focus;
    } else {
      moveTo(Math.max(0, views.value.length - 1));
      phase.value = SessionPhase.Finish;
    }
  }

  async function load() {
    phase.value = SessionPhase.Loading;
    messageKey.value = undefined;
    try {
      const loaded = await mediator.send(getSessionDetail(sessionId));
      detail.value = loaded;
      if (loaded.finished) {
        const { load: score, rpe, minutes } = loaded.finished;
        finished.value = { load: score, rpe, minutes, queued: false };
        phase.value = SessionPhase.Done;
        return;
      }
      stopAwake ??= startAwake();
      swaps.value = swapStore.read(sessionId);
      finishMinutes.value = loaded.minutes;
      resume();
    } catch (error) {
      if (error instanceof AppError && error.code === AppErrorCode.Unauthorized) {
        return onNavigate(ROUTE_WHEN_SIGNED_OUT);
      }
      messageKey.value = toMessageKey(error, LOAD_ERROR_KEYS, SessionMessageKey.Unknown);
      phase.value = SessionPhase.Failed;
    }
  }

  function close() {
    rest.stop();
    releaseAwake();
  }

  function report(setId: string, setNumber: number, status: SetSaveStatus) {
    if (setId === latestSetId) setStatus.value = { setId, setNumber, status };
  }

  /** Logs the set the steppers show: on the screen at once, then on the device and to the server. */
  async function logCurrentSet() {
    const view = views.value[position.value];
    const current = detail.value;
    if (!view || !current || phase.value !== SessionPhase.Focus || !focus.value?.showSteppers)
      return;
    const setNumber = nextSetNumber(view.exercise.loggedSets);
    if (setNumber > MAX_LOGGED_SETS) return;

    const set: LogSet = { id: makeId(), exerciseId: view.exerciseId, setNumber, ...draft.value };
    detail.value = addLoggedSet(current, view.exercise.id, set);
    latestSetId = set.id;
    setStatus.value = undefined;
    errorKey.value = undefined;

    const next = nextSetTarget(views.value, position.value);
    if (next) {
      const nextView = views.value[next.position];
      moveTo(next.position);
      const seconds = restSecondsFor(view.exercise.slot);
      if (nextView && seconds > 0) {
        restNext.value = { name: localizedName(nextView, locale()), setNumber: next.setNumber };
        rest.start(seconds);
      }
    } else {
      addingSet.value = false;
      phase.value = SessionPhase.Finish;
    }

    try {
      const result = await mediator.send(logSet(sessionId, set));
      if (isQueued(result)) return report(set.id, setNumber, SetSaveStatus.Queued);
      if (result.status === RecordStatus.Rejected) {
        // The server will not keep it, so neither does the screen: back to where it was.
        if (detail.value) detail.value = removeLoggedSet(detail.value, set.id);
        rest.stop();
        restNext.value = undefined;
        errorKey.value = SessionMessageKey.SetRejected;
        return resume();
      }
      report(set.id, setNumber, SetSaveStatus.Saved);
    } catch (error) {
      if (error instanceof AppError && error.code === AppErrorCode.Unauthorized) {
        return onNavigate(ROUTE_WHEN_SIGNED_OUT);
      }
      // Written on the device before the send was tried; only the sending failed.
      report(set.id, setNumber, SetSaveStatus.NotSent);
    }
  }

  function addSet() {
    const view = views.value[position.value];
    if (!view || !focus.value?.canAddSet) return;
    draft.value = defaultSetDraft(view);
    addingSet.value = true;
  }

  function nextExercise() {
    if (position.value < views.value.length - 1) moveTo(position.value + 1);
  }

  function showFocus() {
    phase.value = SessionPhase.Focus;
  }

  function showOverview() {
    phase.value = SessionPhase.Overview;
  }

  function jumpTo(index: number) {
    moveTo(index);
    phase.value = SessionPhase.Focus;
  }

  function showFinish() {
    sheet.value = SessionSheet.None;
    phase.value = SessionPhase.Finish;
  }

  /** Finishing with sets left asks first; with none left it goes straight to the question. */
  function requestFinish() {
    if (setsLeft.value === 0) showFinish();
    else sheet.value = SessionSheet.ConfirmFinish;
  }

  function openSwap() {
    sheet.value = SessionSheet.Swap;
  }

  function closeSheet() {
    sheet.value = SessionSheet.None;
  }

  /** The rest of this Session does the swapped exercise; the choice is kept on the device. */
  function swapTo(option: SwapOption) {
    const view = views.value[position.value];
    if (!view) return;
    swaps.value = withSwap(swaps.value, view.exercise, option.exerciseId);
    swapStore.write(sessionId, swaps.value);
    sheet.value = SessionSheet.None;
    const swapped = views.value[position.value];
    if (swapped) draft.value = defaultSetDraft(swapped);
  }

  async function submitFinish() {
    const rpe = finishRpe.value;
    if (rpe === undefined || submitting.value) return;
    submitting.value = true;
    errorKey.value = undefined;
    const minutes = finishMinutes.value;
    try {
      const result = await mediator.send(finishSession(sessionId, { id: makeId(), rpe, minutes }));
      finished.value = isQueued(result)
        ? { load: sessionLoad(rpe, minutes), rpe, minutes, queued: true }
        : {
            load: result.finished.load,
            rpe: result.finished.rpe,
            minutes: result.finished.minutes,
            queued: false,
          };
      swapStore.clear(sessionId);
      close();
      phase.value = SessionPhase.Done;
    } catch (error) {
      if (error instanceof AppError && error.code === AppErrorCode.Unauthorized) {
        return onNavigate(ROUTE_WHEN_SIGNED_OUT);
      }
      errorKey.value = SessionMessageKey.FinishFailed;
    } finally {
      submitting.value = false;
    }
  }

  return {
    phase,
    messageKey,
    errorKey,
    focus,
    draft,
    setStatus,
    overview,
    swapOptions,
    sheet,
    setsLeft,
    restView,
    finishRpe,
    finishMinutes,
    finished,
    submitting,
    load,
    close,
    logCurrentSet,
    addSet,
    nextExercise,
    showFocus,
    showOverview,
    jumpTo,
    requestFinish,
    showFinish,
    openSwap,
    closeSheet,
    swapTo,
    skipRest: rest.skip,
    addRestTime: () => rest.add(REST_ADD_SECONDS),
    submitFinish,
  };
}
