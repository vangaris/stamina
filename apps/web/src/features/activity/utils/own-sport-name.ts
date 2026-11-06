import { SportKind, type SavedProfile } from '@stamina/contracts';

/** The name of the person's own sport, if the profile has one. */
export function ownSportName(profile: SavedProfile): string | undefined {
  return profile.sport.kind === SportKind.Other ? profile.sport.name : undefined;
}
