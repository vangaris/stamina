import { SportKind, savedProfileSchema, type SavedProfile } from '@stamina/contracts';
import type { ProfileRow } from './types.ts';

/** The stored row as the contract's `SavedProfile`; the schema also guards against a corrupt row. */
export function toSavedProfile(row: ProfileRow): SavedProfile {
  const hasTrainingWeek =
    row.sessionsPerWeek !== null && row.sessionMinutes !== null && row.availableDays !== null;
  return savedProfileSchema.parse({
    needs: row.needs,
    birthYear: row.birthYear,
    country: row.country,
    sport:
      row.sportKind === SportKind.Launch
        ? { kind: SportKind.Launch, sport: row.launchSport }
        : { kind: SportKind.Other, name: row.otherSportName },
    playDays: row.playDays,
    playVaries: row.playVaries,
    playMinutes: row.playMinutes,
    playIntensity: row.playIntensity,
    goal: row.goal,
    ...(hasTrainingWeek
      ? {
          trainingWeek: {
            sessionsPerWeek: row.sessionsPerWeek,
            sessionMinutes: row.sessionMinutes,
            availableDays: row.availableDays,
          },
        }
      : {}),
    locale: row.locale,
    units: row.units,
    hotConditionsDefault: row.hotConditionsDefault,
  });
}
