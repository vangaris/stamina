import type { Services } from '@stamina/app-core';
import { ApiError } from '@stamina/contracts';
import { BodyArea, ScreeningQuestion, StopFlag } from '@stamina/domain';
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

const NOW = new Date(2026, 10, 6, 18, 30);

async function setup(options: SetupSafetyOptions = {}, now: () => Date = () => NOW) {
  const { services, mediator } = await setupSafety(options);
  const guard = createSafetyGuard({ ungatedRoutes: UNGATED_ROUTES, mediator: () => mediator, now });
  const open = (to: Partial<RouteLocationNormalized>) =>
    guard(to as RouteLocationNormalized, {} as RouteLocationNormalized, () => {});
  const go = (name: RouteName) => open({ name, matched: [{} as never] });
  return { services, open, go };
}

const REPORT_ID = '0f8f3a52-6f0e-4c53-9d3e-2f3a6a9b7c11';
const TODAY = '2026-11-06';

function report(services: Services, flag: StopFlag, bodyArea?: BodyArea) {
  return services.api.reportStopFlag({
    id: REPORT_ID,
    flag,
    date: TODAY,
    ...(bodyArea ? { bodyArea } : {}),
  });
}

async function consentAndScreen(services: Services, yes: ScreeningQuestion[]) {
  await grantBothConsents(services);
  await services.api.saveScreening(screeningSubmission(yes));
}

describe('the safety guard', () => {
  it('gates every route that is not on the ungated list: the four tabs, a Session, Settings and the Program screens', () => {
    expect(GATED_ROUTES).toEqual([
      RouteName.Today,
      RouteName.Session,
      RouteName.SessionDetail,
      RouteName.Meals,
      RouteName.Progress,
      RouteName.Settings,
      RouteName.SettingsSafety,
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

  it.each([
    StopFlag.ChestPain,
    StopFlag.Fainting,
    StopFlag.Breathlessness,
    StopFlag.Heartbeat,
    StopFlag.HeadKnock,
  ])(
    'sends a person paused by %s to the paused screen from every gated route, and lets them in once they confirm',
    async (flag) => {
      const { services, go } = await setup();
      await consentAndScreen(services, []);
      await report(services, flag);

      for (const name of GATED_ROUTES) expect(await go(name)).toBe(RoutePath.Paused);

      await services.api.confirmDoctorSeen({ flags: [flag] });

      expect(await go(RouteName.Today)).toBe(true);
    },
  );

  it('does not pause a person for a fever or new pain', async () => {
    const fever = await setup();
    await consentAndScreen(fever.services, []);
    await report(fever.services, StopFlag.Fever);
    const pain = await setup();
    await consentAndScreen(pain.services, []);
    await report(pain.services, StopFlag.NewPain, BodyArea.Knee);

    expect(await fever.go(RouteName.Today)).toBe(true);
    expect(await pain.go(RouteName.Today)).toBe(true);
  });

  it('sends the Session route to Today on the day of a fever, and opens every other route', async () => {
    const { services, go } = await setup();
    await consentAndScreen(services, []);
    await report(services, StopFlag.Fever);

    expect(await go(RouteName.SessionDetail)).toBe(RoutePath.Today);
    for (const name of GATED_ROUTES.filter((route) => route !== RouteName.SessionDetail)) {
      expect(await go(name)).toBe(true);
    }
  });

  it('opens the Session route the day after a fever, by the same calendar', async () => {
    const tomorrow = new Date(2026, 10, 7, 7, 0);
    const { services, go } = await setup({}, () => tomorrow);
    await consentAndScreen(services, []);
    await report(services, StopFlag.Fever);

    expect(await go(RouteName.SessionDetail)).toBe(true);
  });

  it('opens the Session route when nothing is reported, and after new pain', async () => {
    const none = await setup();
    await consentAndScreen(none.services, []);
    const pain = await setup();
    await consentAndScreen(pain.services, []);
    await report(pain.services, StopFlag.NewPain, BodyArea.Knee);

    expect(await none.go(RouteName.SessionDetail)).toBe(true);
    expect(await pain.go(RouteName.SessionDetail)).toBe(true);
  });

  it('sends a Referred person who also reported a stop flag to the referral screen first', async () => {
    const { services, go } = await setup();
    await consentAndScreen(services, [ScreeningQuestion.HeartCondition]);
    await report(services, StopFlag.ChestPain);

    expect(await go(RouteName.Today)).toBe(RoutePath.Referred);
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
