import { resolveLocale } from '@stamina/i18n';
import { DEFAULT_PLAY_MINUTES, DEFAULT_SESSIONS_PER_WEEK } from '../config.ts';
import type { OnboardingDraft } from '../types.ts';
import { defaultUnits } from './default-units.ts';

/** A blank draft. Language and units are pre-filled from the device and stay editable. */
export function createDraft(languages: readonly string[]): OnboardingDraft {
  return {
    needs: undefined,
    birthYear: '',
    country: '',
    locale: resolveLocale(languages),
    units: defaultUnits(languages),
    sport: undefined,
    otherSportName: '',
    playDays: [],
    playVaries: false,
    playMinutes: DEFAULT_PLAY_MINUTES,
    playIntensity: undefined,
    goal: undefined,
    sessionsPerWeek: DEFAULT_SESSIONS_PER_WEEK,
    sessionMinutes: undefined,
    availableDays: [],
  };
}
