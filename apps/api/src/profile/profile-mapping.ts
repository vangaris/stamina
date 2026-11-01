import {
  SportKind,
  savedProfileSchema,
  type ProfileAnswers,
  type SavedProfile,
} from '@stamina/contracts';
import { isHotDefaultSport } from '@stamina/domain';
import type { profile } from '../db/schema.ts';

type ProfileRow = typeof profile.$inferSelect;
type ProfileValues = Omit<typeof profile.$inferInsert, 'userId' | 'createdAt' | 'updatedAt'>;

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
