import { AppError, AppErrorCode, recheckScreening } from '@stamina/app-core';
import { RecordStatus } from '@stamina/contracts';
import { TrainingMode, type BodyArea, type ScreeningQuestion } from '@stamina/domain';
import { ref } from 'vue';
import { RoutePath } from '../../../enums/route-path.ts';
import { toMessageKey } from '../../../utils/to-message-key.ts';
import { applyAnswer, createScreeningDraft } from '../../safety/index.ts';
import { RECHECK_ERROR_KEYS, RECHECK_REJECTION_ROUTES, ROUTE_WHEN_SIGNED_OUT } from '../config.ts';
import { StopFlagMessageKey } from '../enums/stop-flag-message-key.ts';
import type { RecheckDraft, RecheckErrors, RecheckResult, UseRecheckOptions } from '../types.ts';
import { toRecheckSubmission } from '../utils/to-recheck-submission.ts';
import { validateRecheck } from '../utils/validate-recheck.ts';

const NO_ERRORS: RecheckErrors = { answers: {} };

/**
 * The Screening questions a stop flag asks again: the answers as the person gives them, what is
 * still missing, and sending them. The server decides the outcome of the new Screening; `submit`
 * says where the person goes (Referred, a step the server needs first, sign-in) or that they
 * carry on. `onSettled` is called when the server took the answers or refused them by a rule,
 * never for a failure to send, so a re-ask that did not get through is asked again.
 */
export function useRecheck({ mediator, onSettled }: UseRecheckOptions) {
  const draft = ref<RecheckDraft>(createScreeningDraft());
  const errors = ref<RecheckErrors>(NO_ERRORS);
  const errorKey = ref<StopFlagMessageKey | undefined>();
  const busy = ref(false);

  /** Clears the answers and errors; the area picker starts with `areas`. */
  function reset(areas: BodyArea[] = []) {
    draft.value = { ...createScreeningDraft(), bodyAreas: areas };
    errors.value = NO_ERRORS;
    errorKey.value = undefined;
    busy.value = false;
  }

  function answer(question: ScreeningQuestion, value: boolean) {
    draft.value = applyAnswer(draft.value, question, value);
    errors.value = { answers: omitKey(errors.value.answers, question) };
    errorKey.value = undefined;
  }

  function setBodyAreas(areas: BodyArea[]) {
    draft.value = { ...draft.value, bodyAreas: areas };
    errors.value = { answers: errors.value.answers };
    errorKey.value = undefined;
  }

  /** Sends the answers to `questions`. Nothing (stay on the questions) while anything is missing, busy or failed. */
  async function submit(
    questions: readonly ScreeningQuestion[],
  ): Promise<RecheckResult | undefined> {
    if (busy.value) return undefined;
    errorKey.value = undefined;
    errors.value = validateRecheck(questions, draft.value);
    if (Object.keys(errors.value.answers).length > 0 || errors.value.bodyAreas) return undefined;
    const submission = toRecheckSubmission(questions, draft.value);
    if (!submission) {
      errorKey.value = StopFlagMessageKey.RecheckUnknown;
      return undefined;
    }

    busy.value = true;
    try {
      const result = await mediator.send(recheckScreening(submission));
      onSettled();
      if (result.status === RecordStatus.Rejected) {
        return { path: RECHECK_REJECTION_ROUTES[result.reason] };
      }
      if (result.screening.trainingMode === TrainingMode.Referred) {
        return { path: RoutePath.Referred };
      }
      return { path: undefined };
    } catch (error) {
      if (error instanceof AppError && error.code === AppErrorCode.Unauthorized) {
        return { path: ROUTE_WHEN_SIGNED_OUT };
      }
      errorKey.value = toMessageKey(error, RECHECK_ERROR_KEYS, StopFlagMessageKey.RecheckUnknown);
      return undefined;
    } finally {
      busy.value = false;
    }
  }

  return { draft, errors, errorKey, busy, reset, answer, setBodyAreas, submit };
}

function omitKey<K extends string, V>(
  record: Partial<Record<K, V>>,
  key: K,
): Partial<Record<K, V>> {
  return Object.fromEntries(Object.entries(record).filter(([entry]) => entry !== key)) as Partial<
    Record<K, V>
  >;
}
