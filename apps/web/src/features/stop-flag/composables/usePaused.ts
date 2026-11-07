import { AppError, AppErrorCode, SafetyStatus, confirmDoctorSeen } from '@stamina/app-core';
import type { ScreeningQuestion, StopFlag } from '@stamina/domain';
import { computed, ref } from 'vue';
import { toMessageKey } from '../../../utils/to-message-key.ts';
import { useSafetyRoute } from '../../safety/index.ts';
import { PAUSED_ERROR_KEYS, ROUTE_WHEN_SIGNED_OUT } from '../config.ts';
import { PausedStep } from '../enums/paused-step.ts';
import { StopFlagMessageKey } from '../enums/stop-flag-message-key.ts';
import type { UsePausedOptions } from '../types.ts';
import { createRecheckOwedStore } from '../utils/create-recheck-owed-store.ts';
import { toPausedConfirmCopy } from '../utils/to-paused-confirm-copy.ts';
import { toPausedOutcomes } from '../utils/to-paused-outcomes.ts';
import { toRecheckQuestions } from '../utils/to-recheck-questions.ts';
import { useRecheck } from './useRecheck.ts';

const NO_FLAGS: readonly StopFlag[] = [];

/**
 * The paused screen: what pauses training, in the words of the stop flags, and the one way back,
 * "A doctor has seen me" ("has cleared me" when only a head knock pauses). Confirming ends the
 * pauses that were shown on the server. If a report that paused training asked Screening
 * questions again and they were never answered, they are asked now, before the person goes on;
 * then it asks where the person stands again and goes there (Today when nothing else is in the
 * way, Referred when the answers refer them). Confirming needs the server, and refuses while a
 * report is still waiting on this phone to be sent. A person who is not paused leaves for the
 * screen they belong on. Never logs what it shows.
 */
export function usePaused(options: UsePausedOptions) {
  const recheckOwed = options.recheckOwed ?? createRecheckOwedStore(localStorage);
  const route = useSafetyRoute(SafetyStatus.Paused, options);

  const step = ref(PausedStep.Confirm);
  const errorKey = ref<StopFlagMessageKey | undefined>();
  const busy = ref(false);
  /** The flags whose questions are asked once the pause is confirmed. */
  const owedFlags = ref<readonly StopFlag[]>(NO_FLAGS);

  const pausing = computed(() =>
    route.state.value?.status === SafetyStatus.Paused ? route.state.value.stop.pausing : NO_FLAGS,
  );
  const outcomes = computed(() => toPausedOutcomes(pausing.value));
  const confirmCopy = computed(() => toPausedConfirmCopy(outcomes.value));
  const questions = computed<ScreeningQuestion[]>(() => toRecheckQuestions(owedFlags.value));

  const recheck = useRecheck({
    mediator: route.mediator,
    onSettled: () => {
      for (const flag of owedFlags.value) recheckOwed.settle(flag);
    },
  });

  async function confirm() {
    if (busy.value || step.value !== PausedStep.Confirm || pausing.value.length === 0) return;
    busy.value = true;
    errorKey.value = undefined;
    const confirmed = pausing.value;
    try {
      await route.mediator.send(confirmDoctorSeen(confirmed));
      const owed = recheckOwed.owed().filter((flag) => confirmed.includes(flag));
      if (owed.length > 0) {
        owedFlags.value = owed;
        recheck.reset();
        step.value = PausedStep.Recheck;
        return;
      }
      // Leaves for the screen the person belongs on now; stays (and refreshes) if still paused.
      await route.load();
    } catch (error) {
      if (error instanceof AppError && error.code === AppErrorCode.Unauthorized) {
        return options.onNavigate(ROUTE_WHEN_SIGNED_OUT);
      }
      errorKey.value = toMessageKey(error, PAUSED_ERROR_KEYS, StopFlagMessageKey.PausedUnknown);
    } finally {
      busy.value = false;
    }
  }

  /** Sends the questions that were owed; then on to wherever the person belongs. */
  async function submitRecheck() {
    if (step.value !== PausedStep.Recheck) return;
    const result = await recheck.submit(questions.value);
    if (!result) return;
    if (result.path) options.onNavigate(result.path);
    else await route.load();
  }

  return {
    phase: route.phase,
    step,
    outcomes,
    confirmCopy,
    errorKey,
    busy,
    questions,
    draft: recheck.draft,
    errors: recheck.errors,
    recheckErrorKey: recheck.errorKey,
    recheckBusy: recheck.busy,
    answer: recheck.answer,
    setBodyAreas: recheck.setBodyAreas,
    load: route.load,
    confirm,
    submitRecheck,
  };
}
