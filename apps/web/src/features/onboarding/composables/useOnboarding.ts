import {
  AppError,
  AppErrorCode,
  getProfile,
  getSession,
  ProfileStatus,
  saveProfile,
  SessionStatus,
} from '@stamina/app-core';
import { ProfileRejection, profileRejectionFor, SaveProfileStatus } from '@stamina/contracts';
import { computed, ref } from 'vue';
import { i18n } from '../../../i18n.ts';
import { useMediator } from '../../../mediator.ts';
import { ERRORS_CLEARED_WITH, SAVE_ERROR_KEYS } from '../config.ts';
import { OnboardingExit } from '../enums/onboarding-exit.ts';
import { OnboardingMessageKey } from '../enums/onboarding-message-key.ts';
import { OnboardingPhase } from '../enums/onboarding-phase.ts';
import { OnboardingStep } from '../enums/onboarding-step.ts';
import type {
  DraftUpdate,
  FieldErrors,
  OnboardingDraft,
  StopReason,
  UseOnboardingOptions,
} from '../types.ts';
import { applyDraftUpdate } from '../utils/apply-draft-update.ts';
import { createDraft } from '../utils/create-draft.ts';
import { localEligibility } from '../utils/local-eligibility.ts';
import { stepsForNeeds } from '../utils/steps-for-needs.ts';
import { toProfileAnswers } from '../utils/to-profile-answers.ts';
import { toMessageKey } from '../utils/to-message-key.ts';
import { validateStep } from '../utils/validate-step.ts';

/**
 * The onboarding screens. On start it learns where the person stands (signed in? profile
 * saved? invite remembered?) and either leaves with an `OnboardingExit` or shows the screens.
 * Someone who cannot use Stamina (under 18, outside the EU/EEA) is stopped on this device with
 * nothing sent. The answers live only in this component's state until the last screen saves
 * them, and they are never logged.
 */
export function useOnboarding(options: UseOnboardingOptions) {
  const mediator = options.mediator ?? useMediator();
  const currentYear = options.currentYear ?? new Date().getUTCFullYear();
  const languages = options.languages ?? navigator.languages;
  const applyLocale =
    options.applyLocale ??
    ((locale) => {
      i18n.global.locale.value = locale;
    });

  const phase = ref(OnboardingPhase.Loading);
  const step = ref(OnboardingStep.About);
  const draft = ref<OnboardingDraft>(createDraft(languages));
  const errors = ref<FieldErrors>({});
  const stop = ref<StopReason | undefined>();
  const errorKey = ref<OnboardingMessageKey | undefined>();
  const busy = ref(false);

  const steps = computed(() => stepsForNeeds(draft.value.needs));
  const stepIndex = computed(() => steps.value.indexOf(step.value));
  const stepNumber = computed(() => stepIndex.value + 1);
  const stepCount = computed(() => steps.value.length);
  const isLast = computed(() => stepNumber.value === stepCount.value);

  async function load() {
    phase.value = OnboardingPhase.Loading;
    try {
      const session = await mediator.send(getSession());
      if (session.status !== SessionStatus.SignedIn)
        return options.onExit(OnboardingExit.SignedOut);
      const state = await mediator.send(getProfile());
      if (state.status === ProfileStatus.Present)
        return options.onExit(OnboardingExit.ProfileExists);
      if (state.status === ProfileStatus.InviteNeeded) {
        return options.onExit(OnboardingExit.InviteNeeded);
      }
      phase.value = OnboardingPhase.Ready;
    } catch (error) {
      if (error instanceof AppError && error.code === AppErrorCode.Unauthorized) {
        return options.onExit(OnboardingExit.SignedOut);
      }
      phase.value = OnboardingPhase.Failed;
    }
  }

  function update(change: DraftUpdate) {
    draft.value = applyDraftUpdate(draft.value, change);
    const cleared = [change.field, ...(ERRORS_CLEARED_WITH[change.field] ?? [])];
    errors.value = Object.fromEntries(
      Object.entries(errors.value).filter(([field]) => !cleared.some((key) => key === field)),
    );
    errorKey.value = undefined;
    if (change.field === 'locale') applyLocale(change.value);
  }

  /** Age first, then the other answers, then country: the order the rule and the person expect. */
  function checkAbout(): boolean {
    const eligibility = localEligibility(draft.value, currentYear);
    const rejection = eligibility && profileRejectionFor(eligibility);
    if (rejection === ProfileRejection.UnderAge) {
      stop.value = rejection;
      return false;
    }
    errors.value = validateStep(OnboardingStep.About, draft.value, currentYear);
    if (Object.keys(errors.value).length > 0) return false;
    if (rejection === ProfileRejection.OutsideEea) {
      stop.value = rejection;
      return false;
    }
    return true;
  }

  async function submit() {
    const answers = toProfileAnswers(draft.value);
    if (!answers) {
      errorKey.value = OnboardingMessageKey.Unknown;
      return;
    }
    busy.value = true;
    errorKey.value = undefined;
    try {
      const result = await mediator.send(saveProfile(answers));
      if (result.status === SaveProfileStatus.Saved) return options.onExit(OnboardingExit.Finished);
      if (result.reason === ProfileRejection.InviteInvalid) {
        return options.onExit(OnboardingExit.InviteRejected);
      }
      // The server applies the same rule: show the same stop, from the first screen.
      stop.value = result.reason;
      step.value = OnboardingStep.About;
    } catch (error) {
      if (error instanceof AppError && error.code === AppErrorCode.Unauthorized) {
        return options.onExit(OnboardingExit.SignedOut);
      }
      errorKey.value = toMessageKey(error, SAVE_ERROR_KEYS, OnboardingMessageKey.Unknown);
    } finally {
      busy.value = false;
    }
  }

  async function next() {
    if (busy.value) return;
    errorKey.value = undefined;
    if (step.value === OnboardingStep.About) {
      if (!checkAbout()) return;
    } else {
      errors.value = validateStep(step.value, draft.value, currentYear);
      if (Object.keys(errors.value).length > 0) return;
    }
    if (isLast.value) return submit();
    step.value = steps.value[stepIndex.value + 1] ?? step.value;
  }

  function back() {
    if (busy.value) return;
    errors.value = {};
    errorKey.value = undefined;
    step.value = steps.value[stepIndex.value - 1] ?? step.value;
  }

  /** From a stop screen back to the answers that caused it. */
  function changeAnswers() {
    stop.value = undefined;
  }

  return {
    phase,
    step,
    draft,
    errors,
    stop,
    errorKey,
    busy,
    stepNumber,
    stepCount,
    load,
    update,
    next,
    back,
    changeAnswers,
  };
}
