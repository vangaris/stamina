import { SportKind } from '@stamina/contracts';
import { LaunchSport } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { toSportLabel } from './to-sport-label.ts';

const translate = (key: string) => `[${key}]`;

describe('toSportLabel', () => {
  it('translates a launch sport', () => {
    expect(toSportLabel({ kind: SportKind.Launch, sport: LaunchSport.Padel }, translate)).toBe(
      '[onboarding.sport.sport.options.padel]',
    );
  });

  it("shows a sport of the person's own as they named it", () => {
    expect(toSportLabel({ kind: SportKind.Other, name: 'Squash' }, translate)).toBe('Squash');
  });
});
