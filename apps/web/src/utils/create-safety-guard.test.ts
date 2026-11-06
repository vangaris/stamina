import type { Services } from '@stamina/app-core';
import { ApiError } from '@stamina/contracts';
import { ScreeningQuestion } from '@stamina/domain';
import type { RouteLocationNormalized } from 'vue-router';
import { describe, expect, it } from 'vitest';
import { UNGATED_ROUTES } from '../config.ts';
import { RouteName } from '../enums/route-name.ts';
import { RoutePath } from '../enums/route-path.ts';
import {
  grantBothConsents,
  screeningSubmission,
  setupSafety,
  type SetupSafetyOptions,
} from '../features/safety/testing/setup-safety.ts';
import { createSafetyGuard } from './create-safety-guard.ts';

const GATED_ROUTES = Object.values(RouteName).filter((name) => !UNGATED_ROUTES.includes(name));

async function setup(options: SetupSafetyOptions = {}) {
  const { services, mediator } = await setupSafety(options);
  const guard = createSafetyGuard({ ungatedRoutes: UNGATED_ROUTES, mediator: () => mediator });
  const open = (to: Partial<RouteLocationNormalized>) =>
    guard(to as RouteLocationNormalized, {} as RouteLocationNormalized, () => {});
  const go = (name: RouteName) => open({ name, matched: [{} as never] });
  return { services, open, go };
}

async function consentAndScreen(services: Services, yes: ScreeningQuestion[]) {
  await grantBothConsents(services);
  await services.api.saveScreening(screeningSubmission(yes));
}

describe('the safety guard', () => {
  it('gates every route that is not on the ungated list: the four tabs, a Session and the Program screens', () => {
    expect(GATED_ROUTES).toEqual([
      RouteName.Today,
      RouteName.Session,
      RouteName.SessionDetail,
      RouteName.Meals,
      RouteName.Progress,
      RouteName.Reveal,
      RouteName.Week,
    ]);
  });

  it.each(GATED_ROUTES)('sends a person without a profile from %s to onboarding', async (name) => {
    const { go } = await setup({ onboarded: false });

    expect(await go(name)).toBe(RoutePath.Onboarding);
  });

  it('sends a person without a profile to onboarding even when consents are given', async () => {
    const { services, go } = await setup({ onboarded: false });
    await grantBothConsents(services);

    expect(await go(RouteName.Today)).toBe(RoutePath.Onboarding);
  });

  it.each(GATED_ROUTES)(
    'sends an onboarded new person from %s to the consent screen',
    async (name) => {
      const { go } = await setup();

      expect(await go(name)).toBe(RoutePath.Consent);
    },
  );

  it('sends someone who consented but did not answer the Screening to the Screening', async () => {
    const { services, go } = await setup();
    await grantBothConsents(services);

    expect(await go(RouteName.Today)).toBe(RoutePath.Screening);
  });

  it('sends a Referred person to the referral screen from every gated route', async () => {
    const { services, go } = await setup();
    await consentAndScreen(services, [ScreeningQuestion.HeartCondition]);

    for (const name of GATED_ROUTES) expect(await go(name)).toBe(RoutePath.Referred);
  });

  it('lets a cleared person in, and a Referred person who stated a doctor said they can train', async () => {
    const cleared = await setup();
    await consentAndScreen(cleared.services, []);
    const limited = await setup();
    await consentAndScreen(limited.services, [ScreeningQuestion.Fainting]);
    await limited.services.api.recordDoctorOk();

    expect(await cleared.go(RouteName.Today)).toBe(true);
    expect(await limited.go(RouteName.Meals)).toBe(true);
  });

  it('does not look at the ungated routes', async () => {
    const { go } = await setup({ onboarded: false });

    for (const name of UNGATED_ROUTES) expect(await go(name)).toBe(true);
  });

  it('gates a matched route that has no name, and leaves a path that matches nothing alone', async () => {
    const { open } = await setup({ onboarded: false });

    expect(await open({ matched: [{} as never] })).toBe(RoutePath.Onboarding);
    expect(await open({ matched: [] })).toBe(true);
  });

  it('sends an Unauthorized answer to the start screen: a lapsed session looks like no session', async () => {
    const { go } = await setup({ signedIn: false });

    expect(await go(RouteName.Today)).toBe(RoutePath.Start);
  });

  it('falls back to the Screening screen, which can retry, when the question cannot be answered', async () => {
    const { go } = await setup({
      api: () => ({ getSafety: () => Promise.reject(new ApiError(500)) }),
    });

    expect(await go(RouteName.Today)).toBe(RoutePath.Screening);
  });
});
