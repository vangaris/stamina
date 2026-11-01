import { Need } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { OnboardingStep } from '../enums/onboarding-step.ts';
import { stepsForNeeds } from './steps-for-needs.ts';

describe('stepsForNeeds', () => {
  it('skips the training week for food only', () => {
    expect(stepsForNeeds(Need.Food)).toEqual([
      OnboardingStep.About,
      OnboardingStep.Sport,
      OnboardingStep.Goal,
    ]);
  });

  it.each([[Need.Training], [Need.Both], [undefined]])('asks the training week for %s', (needs) => {
    expect(stepsForNeeds(needs).at(-1)).toBe(OnboardingStep.Week);
  });
});
