import { SportKind } from '@stamina/contracts';
import { Goal, Intensity, LaunchSport, Need, Weekday } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { OnboardingMessageKey } from '../enums/onboarding-message-key.ts';
import { OnboardingStep } from '../enums/onboarding-step.ts';
import type { OnboardingDraft } from '../types.ts';
import { createDraft } from './create-draft.ts';
import { validateStep } from './validate-step.ts';

const NOW = 2026;
const blank = createDraft(['en-GB']);
const validAbout: OnboardingDraft = {
  ...blank,
  needs: Need.Both,
  birthYear: '1990',
  country: 'GR',
};
const validSport: OnboardingDraft = {
  ...blank,
  sport: LaunchSport.Padel,
  playDays: [Weekday.Sat],
  playIntensity: Intensity.Hard,
};

describe('validateStep: about you', () => {
  it('asks for every answer on a blank screen', () => {
    expect(validateStep(OnboardingStep.About, blank, NOW)).toEqual({
      needs: OnboardingMessageKey.Needs,
      birthYear: OnboardingMessageKey.BirthYear,
      country: OnboardingMessageKey.Country,
    });
  });

  it('accepts a complete screen', () => {
    expect(validateStep(OnboardingStep.About, validAbout, NOW)).toEqual({});
  });

  it('rejects an implausible birth year and a country that does not exist', () => {
    const errors = validateStep(
      OnboardingStep.About,
      { ...validAbout, birthYear: '2050', country: 'ZZ' },
      NOW,
    );

    expect(errors).toEqual({
      birthYear: OnboardingMessageKey.BirthYear,
      country: OnboardingMessageKey.Country,
    });
  });
});

describe('validateStep: sport and when you play', () => {
  it('asks for the sport, the days and the intensity', () => {
    expect(validateStep(OnboardingStep.Sport, blank, NOW)).toEqual({
      sport: OnboardingMessageKey.Sport,
      playDays: OnboardingMessageKey.PlayDays,
      playIntensity: OnboardingMessageKey.Intensity,
    });
  });

  it('accepts a launch sport with days, or with "It varies"', () => {
    expect(validateStep(OnboardingStep.Sport, validSport, NOW)).toEqual({});
    expect(
      validateStep(OnboardingStep.Sport, { ...validSport, playDays: [], playVaries: true }, NOW),
    ).toEqual({});
  });

  it('wants a name for "Other…", and not just spaces', () => {
    const other = { ...validSport, sport: SportKind.Other } as const;

    expect(validateStep(OnboardingStep.Sport, { ...other, otherSportName: '  ' }, NOW)).toEqual({
      otherSportName: OnboardingMessageKey.OtherSportName,
    });
    expect(
      validateStep(OnboardingStep.Sport, { ...other, otherSportName: 'Surf-ski' }, NOW),
    ).toEqual({});
  });
});

describe('validateStep: Goal', () => {
  it('needs one of the four Goals', () => {
    expect(validateStep(OnboardingStep.Goal, blank, NOW)).toEqual({
      goal: OnboardingMessageKey.Goal,
    });
    expect(validateStep(OnboardingStep.Goal, { ...blank, goal: Goal.Strength }, NOW)).toEqual({});
  });
});

describe('validateStep: training week', () => {
  const week: OnboardingDraft = {
    ...blank,
    sessionsPerWeek: 3,
    sessionMinutes: 45,
    availableDays: [Weekday.Mon, Weekday.Wed, Weekday.Fri],
  };

  it('accepts as many available days as Sessions per week, or more', () => {
    expect(validateStep(OnboardingStep.Week, week, NOW)).toEqual({});
    expect(
      validateStep(
        OnboardingStep.Week,
        { ...week, availableDays: [...week.availableDays, Weekday.Sun] },
        NOW,
      ),
    ).toEqual({});
  });

  it('asks for a length when none is chosen', () => {
    expect(validateStep(OnboardingStep.Week, { ...week, sessionMinutes: undefined }, NOW)).toEqual({
      sessionMinutes: OnboardingMessageKey.SessionMinutes,
    });
  });

  it('asks for more days than the person offered', () => {
    expect(
      validateStep(
        OnboardingStep.Week,
        { ...week, availableDays: [Weekday.Mon, Weekday.Wed] },
        NOW,
      ),
    ).toEqual({ availableDays: OnboardingMessageKey.AvailableDays });
  });

  it('rejects Sessions per week outside 2 to 4', () => {
    const errors = validateStep(OnboardingStep.Week, { ...week, sessionsPerWeek: 5 }, NOW);

    expect(errors.sessionsPerWeek).toBe(OnboardingMessageKey.SessionsPerWeek);
  });
});
