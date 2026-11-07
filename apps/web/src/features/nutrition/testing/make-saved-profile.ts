import { SportKind, type SavedProfile } from '@stamina/contracts';
import { Goal, Intensity, LaunchSport, Need, Units, Weekday } from '@stamina/domain';
import { Locale } from '@stamina/i18n';

export function makeSavedProfile(overrides: Partial<SavedProfile> = {}): SavedProfile {
  return {
    needs: Need.Food,
    birthYear: 1990,
    country: 'GR',
    sport: { kind: SportKind.Launch, sport: LaunchSport.Padel },
    playDays: [Weekday.Tue],
    playVaries: false,
    playMinutes: 90,
    playIntensity: Intensity.Moderate,
    goal: Goal.GeneralFitness,
    locale: Locale.En,
    units: Units.Metric,
    hotConditionsDefault: false,
    ...overrides,
  };
}
