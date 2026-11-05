import { FAKE_INVITE } from '@stamina/app-core';
import { Need } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { RoutePath } from '../../../enums/route-path.ts';
import { profileAnswers, setupSafety } from '../testing/setup-safety.ts';
import { routeAfterSafety } from './route-after-safety.ts';

describe('routeAfterSafety', () => {
  it('goes to the reveal for a person with a training week', async () => {
    const { mediator } = await setupSafety();

    expect(await routeAfterSafety(mediator)).toBe(RoutePath.Reveal);
  });

  it('goes to Today for a food-only person', async () => {
    const { mediator, services } = await setupSafety({ onboarded: false });
    await services.api.saveProfile({
      ...profileAnswers(),
      needs: Need.Food,
      trainingWeek: undefined,
      inviteCode: FAKE_INVITE.validCode,
    });

    expect(await routeAfterSafety(mediator)).toBe(RoutePath.Today);
  });

  it('shows the reveal when the profile cannot be read', async () => {
    const { mediator } = await setupSafety({ signedIn: false });

    expect(await routeAfterSafety(mediator)).toBe(RoutePath.Reveal);
  });
});
