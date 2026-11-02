import { SportKind } from '@stamina/contracts';
import { COUNTRY_CODES, validateTrainingWeek } from '@stamina/domain';
import { KEY_FOR_PROBLEM, MESSAGE_FOR_PROBLEM } from '../config.ts';
import { OnboardingMessageKey } from '../enums/onboarding-message-key.ts';
import { OnboardingStep } from '../enums/onboarding-step.ts';
import type { FieldErrors, OnboardingDraft } from '../types.ts';
import { parseBirthYear } from './parse-birth-year.ts';

function validateAbout(draft: OnboardingDraft, currentYear: number): FieldErrors {
  const errors: FieldErrors = {};
  if (!draft.needs) errors.needs = OnboardingMessageKey.Needs;
  if (parseBirthYear(draft.birthYear, currentYear) === undefined) {
    errors.birthYear = OnboardingMessageKey.BirthYear;
  }
  if (!COUNTRY_CODES.includes(draft.country)) errors.country = OnboardingMessageKey.Country;
  return errors;
}

function validateSport(draft: OnboardingDraft): FieldErrors {
  const errors: FieldErrors = {};
  if (!draft.sport) errors.sport = OnboardingMessageKey.Sport;
  if (draft.sport === SportKind.Other && draft.otherSportName.trim() === '') {
    errors.otherSportName = OnboardingMessageKey.OtherSportName;
  }
  if (!draft.playVaries && draft.playDays.length === 0) {
    errors.playDays = OnboardingMessageKey.PlayDays;
  }
  if (!draft.playIntensity) errors.playIntensity = OnboardingMessageKey.Intensity;
  return errors;
}

function validateGoal(draft: OnboardingDraft): FieldErrors {
  return draft.goal ? {} : { goal: OnboardingMessageKey.Goal };
}

function validateWeek(draft: OnboardingDraft): FieldErrors {
  const problems = validateTrainingWeek({
    sessionsPerWeek: draft.sessionsPerWeek,
    // Not chosen yet is a length the domain does not offer.
    sessionMinutes: draft.sessionMinutes ?? 0,
    availableDays: draft.availableDays,
  });
  const errors: FieldErrors = {};
  for (const problem of problems) errors[KEY_FOR_PROBLEM[problem]] = MESSAGE_FOR_PROBLEM[problem];
  return errors;
}

/**
 * What is wrong with the answers on one screen, as a message per answer; empty when the person
 * can go on. The training week is the domain's `validateTrainingWeek`.
 */
export function validateStep(
  step: OnboardingStep,
  draft: OnboardingDraft,
  currentYear: number,
): FieldErrors {
  switch (step) {
    case OnboardingStep.About:
      return validateAbout(draft, currentYear);
    case OnboardingStep.Sport:
      return validateSport(draft);
    case OnboardingStep.Goal:
      return validateGoal(draft);
    case OnboardingStep.Week:
      return validateWeek(draft);
  }
}
