import { AppError, AppErrorCode, SafetyStatus, saveScreening } from '@stamina/app-core';
import { RecordStatus } from '@stamina/contracts';
import { TrainingMode, type BodyArea, type ScreeningQuestion } from '@stamina/domain';
import { ref } from 'vue';
import { RoutePath } from '../../../enums/route-path.ts';
import { toMessageKey } from '../../../utils/to-message-key.ts';
import { SCREENING_REJECTION_ROUTES } from '../config.ts';
import { SafetyMessageKey } from '../enums/safety-message-key.ts';
import { ScreeningField } from '../enums/screening-field.ts';
import { ScreeningView } from '../enums/screening-view.ts';
import type {
  ScreeningDraft,
  ScreeningErrors,
  ScreeningFieldKey,
  ScreeningOutcomeView,
  UseScreeningOptions,
} from '../types.ts';
import { applyAnswer } from '../utils/apply-answer.ts';
import { createScreeningDraft } from '../utils/create-screening-draft.ts';
import { firstInvalidField } from '../utils/first-invalid-field.ts';
import { scrollToField } from '../utils/scroll-to-field.ts';
import { toScreeningSubmission } from '../utils/to-screening-submission.ts';
import { validateScreening } from '../utils/validate-screening.ts';
import { useSafetyRoute } from './useSafetyRoute.ts';

const SAVE_ERROR_KEYS = { [AppErrorCode.Offline]: SafetyMessageKey.ScreeningOffline };

/**
 * The Screening page: ten yes/no questions and the starting level on one page, none answered
 * beforehand. A person who is referred leaves for the Referred screen; anyone else sees the
 * outcome (notices for Nutrition off and excluded areas) and goes on. The server decides the
 * outcome. The answers live only here until saved, and are never logged.
 */
export function useScreening(options: UseScreeningOptions) {
  const reveal = options.reveal ?? scrollToField;
  const route = useSafetyRoute(SafetyStatus.ScreeningNeeded, options);

  const view = ref(ScreeningView.Questions);
  const draft = ref<ScreeningDraft>(createScreeningDraft());
  const errors = ref<ScreeningErrors>({});
  const errorKey = ref<SafetyMessageKey | undefined>();
  const outcome = ref<ScreeningOutcomeView | undefined>();
  const busy = ref(false);

  function clearError(field: ScreeningFieldKey) {
    errors.value = Object.fromEntries(
      Object.entries(errors.value).filter(([key]) => key !== field),
    );
    errorKey.value = undefined;
  }

  function answer(question: ScreeningQuestion, value: boolean) {
    draft.value = applyAnswer(draft.value, question, value);
    clearError(question);
  }

  function setBodyAreas(areas: BodyArea[]) {
    draft.value = { ...draft.value, bodyAreas: areas };
    clearError(ScreeningField.BodyAreas);
  }

  function setTrainedRegularly(value: boolean) {
    draft.value = { ...draft.value, trainedRegularly: value };
    clearError(ScreeningField.StartingLevel);
  }

  async function submit() {
    if (busy.value) return;
    errorKey.value = undefined;
    errors.value = validateScreening(draft.value);
    const invalid = firstInvalidField(errors.value);
    if (invalid) return reveal(invalid);
    const submission = toScreeningSubmission(draft.value);
    if (!submission) {
      errorKey.value = SafetyMessageKey.ScreeningUnknown;
      return;
    }

    busy.value = true;
    try {
      const result = await route.mediator.send(saveScreening(submission));
      if (result.status === RecordStatus.Rejected) {
        // Refused: a missing profile or a withdrawn consent sends the person to that step.
        return options.onNavigate(SCREENING_REJECTION_ROUTES[result.reason]);
      }
      if (result.screening.trainingMode === TrainingMode.Referred) {
        return options.onNavigate(RoutePath.Referred);
      }
      outcome.value = { screening: result.screening, goalChanged: result.goalChanged };
      view.value = ScreeningView.Outcome;
    } catch (error) {
      if (error instanceof AppError && error.code === AppErrorCode.Unauthorized) {
        return options.onNavigate(RoutePath.Start);
      }
      errorKey.value = toMessageKey(error, SAVE_ERROR_KEYS, SafetyMessageKey.ScreeningUnknown);
    } finally {
      busy.value = false;
    }
  }

  function finish() {
    options.onNavigate(RoutePath.Today);
  }

  return {
    phase: route.phase,
    view,
    draft,
    errors,
    errorKey,
    outcome,
    busy,
    load: route.load,
    answer,
    setBodyAreas,
    setTrainedRegularly,
    submit,
    finish,
  };
}
