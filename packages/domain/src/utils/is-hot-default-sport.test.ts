import { describe, expect, it } from 'vitest';
import { LaunchSport } from '../enums/launch-sport.ts';
import { isHotDefaultSport } from './is-hot-default-sport.ts';

describe('isHotDefaultSport', () => {
  it('is on for exactly kite, windsurf and beach volleyball', () => {
    const hot = Object.values(LaunchSport).filter(isHotDefaultSport);
    expect(hot.sort()).toEqual(
      [LaunchSport.BeachVolleyball, LaunchSport.Kitesurfing, LaunchSport.Windsurfing].sort(),
    );
  });
});
