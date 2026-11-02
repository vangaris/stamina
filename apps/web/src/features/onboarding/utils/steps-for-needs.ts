import { Need } from '@stamina/domain';
import { STEPS_FOOD_ONLY, STEPS_WITH_TRAINING } from '../config.ts';
import type { OnboardingStep } from '../enums/onboarding-step.ts';

/** The screens this person will see: no training week when they only want food. */
export function stepsForNeeds(needs: Need | undefined): readonly OnboardingStep[] {
  return needs === Need.Food ? STEPS_FOOD_ONLY : STEPS_WITH_TRAINING;
}
