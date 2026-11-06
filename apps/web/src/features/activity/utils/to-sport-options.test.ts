import { SportKind } from '@stamina/contracts';
import { LaunchSport } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { toSportOptions } from './to-sport-options.ts';

const label = (sport: LaunchSport) => `name of ${sport}`;

describe('toSportOptions', () => {
  it('offers every launch sport', () => {
    const options = toSportOptions(label, undefined);

    expect(options.map(({ value }) => value)).toEqual(Object.values(LaunchSport));
    expect(options[0]).toEqual({ value: LaunchSport.Padel, label: 'name of padel' });
  });

  it("adds the person's own sport last, under its name", () => {
    const options = toSportOptions(label, 'Squash');

    expect(options.at(-1)).toEqual({ value: SportKind.Other, label: 'Squash' });
    expect(options).toHaveLength(Object.values(LaunchSport).length + 1);
  });
});
