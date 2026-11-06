import { SportKind } from '@stamina/contracts';
import { LaunchSport } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { toSportChoice } from './to-sport-choice.ts';

describe('toSportChoice', () => {
  it('is the launch sport itself', () => {
    expect(toSportChoice({ kind: SportKind.Launch, sport: LaunchSport.Padel })).toBe(
      LaunchSport.Padel,
    );
  });

  it('is "other" for a sport of the person\'s own', () => {
    expect(toSportChoice({ kind: SportKind.Other, name: 'Squash' })).toBe(SportKind.Other);
  });
});
