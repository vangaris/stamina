import { SportKind, type ProfileAnswers } from '@stamina/contracts';
import { isHotDefaultSport } from '@stamina/domain';
import type { ProfileValues } from './types.ts';

/** The columns for a set of answers. The hot conditions default is derived here, never sent by the client. */
export function toProfileValues(answers: ProfileAnswers): ProfileValues {
  const { sport, trainingWeek } = answers;
  return {
    needs: answers.needs,
    birthYear: answers.birthYear,
    country: answers.country,
    sportKind: sport.kind,
    launchSport: sport.kind === SportKind.Launch ? sport.sport : null,
    otherSportName: sport.kind === SportKind.Other ? sport.name : null,
    playDays: answers.playDays,
    playVaries: answers.playVaries,
    playMinutes: answers.playMinutes,
    playIntensity: answers.playIntensity,
    goal: answers.goal,
    sessionsPerWeek: trainingWeek?.sessionsPerWeek ?? null,
    sessionMinutes: trainingWeek?.sessionMinutes ?? null,
    availableDays: trainingWeek?.availableDays ?? null,
    locale: answers.locale,
    units: answers.units,
    hotConditionsDefault: sport.kind === SportKind.Launch && isHotDefaultSport(sport.sport),
  };
}
