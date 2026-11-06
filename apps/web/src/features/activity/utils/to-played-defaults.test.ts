import { SportKind } from '@stamina/contracts';
import { Intensity, LaunchSport } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { makeSavedProfile } from '../testing/make-saved-profile.ts';
import { toPlayedDefaults } from './to-played-defaults.ts';

describe('toPlayedDefaults', () => {
  it("starts from the profile's sport, usual time, effort and hot conditions", () => {
    const profile = makeSavedProfile({
      sport: { kind: SportKind.Launch, sport: LaunchSport.Kitesurfing },
      playMinutes: 120,
      playIntensity: Intensity.Hard,
      hotConditionsDefault: true,
    });

    expect(toPlayedDefaults(profile)).toEqual({
      sport: LaunchSport.Kitesurfing,
      minutes: 120,
      intensity: Intensity.Hard,
      hot: true,
    });
  });

  it('picks "other" when the person plays a sport of their own', () => {
    const profile = makeSavedProfile({ sport: { kind: SportKind.Other, name: 'Squash' } });

    expect(toPlayedDefaults(profile).sport).toBe(SportKind.Other);
  });
});
