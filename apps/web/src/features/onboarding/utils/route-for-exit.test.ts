import { describe, expect, it } from 'vitest';
import { RoutePath } from '../../../enums/route-path.ts';
import { OnboardingExit } from '../enums/onboarding-exit.ts';
import { parseStartNotice } from './parse-start-notice.ts';
import { routeForExit } from './route-for-exit.ts';

describe('routeForExit', () => {
  it('opens Today once the profile is saved or already exists', () => {
    expect(routeForExit(OnboardingExit.Finished)).toBe(RoutePath.Today);
    expect(routeForExit(OnboardingExit.ProfileExists)).toBe(RoutePath.Today);
  });

  it('goes to the invite screen when signed out or without an invite', () => {
    expect(routeForExit(OnboardingExit.SignedOut)).toBe(RoutePath.Start);
    expect(routeForExit(OnboardingExit.InviteNeeded)).toBe(RoutePath.Start);
  });

  it('goes to the invite screen with a notice a rejected invite can be recognised by', () => {
    const route = routeForExit(OnboardingExit.InviteRejected) as {
      path: string;
      query: Record<string, string>;
    };

    expect(route.path).toBe(RoutePath.Start);
    expect(Object.values(route.query).map(parseStartNotice)).toEqual(['invite-rejected']);
  });
});
