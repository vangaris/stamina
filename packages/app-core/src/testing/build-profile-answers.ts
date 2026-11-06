import { SportKind, type ProfileAnswers } from '@stamina/contracts';
import { Goal, Intensity, LaunchSport, Need, Units, Weekday } from '@stamina/domain';
import { Locale } from '@stamina/i18n';

const FOUR_DAYS = [Weekday.Mon, Weekday.Wed, Weekday.Thu, Weekday.Sat];

/** A valid profile of a Greek padel player training 3 x 45 minutes a week; override what a test needs. */
export function buildProfileAnswers(overrides: Partial<ProfileAnswers> = {}): ProfileAnswers {
  return {
    needs: Need.Both,
    birthYear: 1990,
    country: 'GR',
    sport: { kind: SportKind.Launch, sport: LaunchSport.Padel },
    playDays: [Weekday.Tue],
    playVaries: false,
    playMinutes: 90,
    playIntensity: Intensity.Moderate,
    goal: Goal.Strength,
    trainingWeek: { sessionsPerWeek: 3, sessionMinutes: 45, availableDays: FOUR_DAYS },
    locale: Locale.En,
    units: Units.Metric,
    ...overrides,
  };
}
