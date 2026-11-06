import { SportKind } from '@stamina/contracts';
import { describe, expect, it } from 'vitest';
import { makeSavedProfile } from '../testing/make-saved-profile.ts';
import { ownSportName } from './own-sport-name.ts';

describe('ownSportName', () => {
  it("is the name of a sport of the person's own", () => {
    const profile = makeSavedProfile({ sport: { kind: SportKind.Other, name: 'Squash' } });

    expect(ownSportName(profile)).toBe('Squash');
  });

  it('is nothing for a launch sport', () => {
    expect(ownSportName(makeSavedProfile())).toBeUndefined();
  });
});
