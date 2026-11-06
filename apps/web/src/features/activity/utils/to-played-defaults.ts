import type { SavedProfile } from '@stamina/contracts';
import type { PlayedDraft } from '../types.ts';
import { toSportChoice } from './to-sport-choice.ts';

/** What the sheet starts with for this person: their sport, usual time and effort, and hot conditions. */
export function toPlayedDefaults(profile: SavedProfile): PlayedDraft {
  return {
    sport: toSportChoice(profile.sport),
    minutes: profile.playMinutes,
    intensity: profile.playIntensity,
    hot: profile.hotConditionsDefault,
  };
}
