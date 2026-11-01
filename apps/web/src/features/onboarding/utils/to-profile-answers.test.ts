import { SportKind } from '@stamina/contracts';
import { Goal, Intensity, LaunchSport, Need, Units, Weekday } from '@stamina/domain';
import { Locale } from '@stamina/i18n';
import { describe, expect, it } from 'vitest';
import type { OnboardingDraft } from '../types.ts';
import { createDraft } from './create-draft.ts';
import { toProfileAnswers } from './to-profile-answers.ts';

const complete: OnboardingDraft = {
  ...createDraft(['el-GR']),
  needs: Need.Both,
  birthYear: '1990',
  country: 'GR',
  sport: LaunchSport.Padel,
  playDays: [Weekday.Tue, Weekday.Sat],
  playMinutes: 90,
  playIntensity: Intensity.Moderate,
  goal: Goal.SportPerformance,
  sessionsPerWeek: 3,
  sessionMinutes: 45,
  availableDays: [Weekday.Mon, Weekday.Wed, Weekday.Fri],
};

describe('toProfileAnswers', () => {
  it('turns a complete draft into the answers', () => {
    expect(toProfileAnswers(complete)).toEqual({
      needs: Need.Both,
      birthYear: 1990,
      country: 'GR',
      sport: { kind: SportKind.Launch, sport: LaunchSport.Padel },
      playDays: [Weekday.Tue, Weekday.Sat],
      playVaries: false,
      playMinutes: 90,
      playIntensity: Intensity.Moderate,
      goal: Goal.SportPerformance,
      trainingWeek: {
        sessionsPerWeek: 3,
        sessionMinutes: 45,
        availableDays: [Weekday.Mon, Weekday.Wed, Weekday.Fri],
      },
      locale: Locale.El,
      units: Units.Metric,
    });
  });

  it('sends "Other…" as the trimmed name the person typed', () => {
    const answers = toProfileAnswers({
      ...complete,
      sport: SportKind.Other,
      otherSportName: '  Surf-ski ',
    });

    expect(answers?.sport).toEqual({ kind: SportKind.Other, name: 'Surf-ski' });
  });

  it('sends no play days for "It varies"', () => {
    const answers = toProfileAnswers({ ...complete, playVaries: true });

    expect(answers).toMatchObject({ playVaries: true, playDays: [] });
  });

  it('leaves the training week out for food only, even if it was filled in earlier', () => {
    const answers = toProfileAnswers({ ...complete, needs: Need.Food });

    expect(answers).toBeDefined();
    expect(answers).not.toHaveProperty('trainingWeek');
  });

  it('returns nothing for a draft the contract would refuse', () => {
    expect(toProfileAnswers({ ...complete, goal: undefined })).toBeUndefined();
    expect(toProfileAnswers({ ...complete, sessionMinutes: undefined })).toBeUndefined();
    expect(toProfileAnswers({ ...complete, birthYear: '' })).toBeUndefined();
  });
});
