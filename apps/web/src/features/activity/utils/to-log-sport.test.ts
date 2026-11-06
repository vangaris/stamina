import { SportKind } from '@stamina/contracts';
import { LaunchSport } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { toLogSport } from './to-log-sport.ts';

describe('toLogSport', () => {
  it('sends a launch sport by its id', () => {
    expect(toLogSport(LaunchSport.Tennis, undefined)).toEqual({
      kind: SportKind.Launch,
      sport: LaunchSport.Tennis,
    });
  });

  it('sends "other" with the name from the profile', () => {
    expect(toLogSport(SportKind.Other, 'Squash')).toEqual({
      kind: SportKind.Other,
      name: 'Squash',
    });
  });

  it('sends nothing for "other" when the profile has no name', () => {
    expect(toLogSport(SportKind.Other, undefined)).toBeUndefined();
  });
});
