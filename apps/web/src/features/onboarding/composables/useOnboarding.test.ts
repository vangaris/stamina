import {
  AppError,
  AppErrorCode,
  createAppMediator,
  createServices,
  FAKE_INVITE,
  ServicesMode,
  type Services,
} from '@stamina/app-core';
import { ProfileRejection, SportKind, type ApiClient } from '@stamina/contracts';
import { Goal, Intensity, LaunchSport, Need, Weekday } from '@stamina/domain';
import { Locale } from '@stamina/i18n';
import { describe, expect, it, vi } from 'vitest';
import { OnboardingExit } from '../enums/onboarding-exit.ts';
import { OnboardingMessageKey } from '../enums/onboarding-message-key.ts';
import { OnboardingPhase } from '../enums/onboarding-phase.ts';
import { OnboardingStep } from '../enums/onboarding-step.ts';
import type { DraftUpdate } from '../types.ts';
import { useOnboarding } from './useOnboarding.ts';

const NOW = 2026;
const EMAIL = 'ada@example.com';
const FAKE_CODE = '424242';

/** The real mediator over the in-memory services, signed in and holding a valid invite by default. */
async function setup({
  signedIn = true,
  invite = true,
  api,
  languages = ['en-GB'],
}: {
  signedIn?: boolean;
  invite?: boolean;
  /** Replaces some API calls; receives the fake API of the same services, to delegate to. */
  api?: (base: ApiClient) => Partial<ApiClient>;
  languages?: string[];
} = {}) {
  const services: Services = createServices({ mode: ServicesMode.Test });
  if (api) services.api = { ...services.api, ...api(services.api) };
  if (signedIn) await services.auth.verifyEmailCode(EMAIL, FAKE_CODE);
  if (invite) services.inviteStorage.save(FAKE_INVITE.validCode);
  const mediator = createAppMediator({
    services,
    stores: {
      health: { set: () => undefined },
      session: { set: () => undefined },
    },
  });
  const onExit = vi.fn();
  const applyLocale = vi.fn();
  const flow = useOnboarding({ onExit, mediator, currentYear: NOW, languages, applyLocale });
  return { flow, onExit, applyLocale, services };
}

type Flow = Awaited<ReturnType<typeof setup>>['flow'];

const set = (flow: Flow, ...changes: DraftUpdate[]) => changes.forEach((c) => flow.update(c));

const answerAbout = (
  flow: Flow,
  overrides: { birthYear?: string; country?: string; needs?: Need } = {},
) =>
  set(
    flow,
    { field: 'needs', value: overrides.needs ?? Need.Both },
    { field: 'birthYear', value: overrides.birthYear ?? '1990' },
    { field: 'country', value: overrides.country ?? 'GR' },
  );

const answerSport = (flow: Flow) =>
  set(
    flow,
    { field: 'sport', value: LaunchSport.Kitesurfing },
    { field: 'playDays', value: [Weekday.Sat] },
    { field: 'playIntensity', value: Intensity.Hard },
  );

const answerWeek = (flow: Flow) =>
  set(
    flow,
    { field: 'sessionMinutes', value: 45 },
    { field: 'availableDays', value: [Weekday.Mon, Weekday.Wed, Weekday.Fri] },
  );

/** Walks every screen with valid answers, up to (not including) the last Continue. */
async function reachLastScreen(flow: Flow, needs = Need.Both) {
  answerAbout(flow, { needs });
  await flow.next();
  answerSport(flow);
  await flow.next();
  flow.update({ field: 'goal', value: Goal.SportPerformance });
  await flow.next();
  if (needs !== Need.Food) answerWeek(flow);
}

describe('useOnboarding: arriving', () => {
  it('shows the screens to a signed-in person with an invite and no profile yet', async () => {
    const { flow, onExit } = await setup();

    await flow.load();

    expect(flow.phase.value).toBe(OnboardingPhase.Ready);
    expect(onExit).not.toHaveBeenCalled();
  });

  it('sends a signed-out person back to the start', async () => {
    const { flow, onExit } = await setup({ signedIn: false });

    await flow.load();

    expect(onExit).toHaveBeenCalledWith(OnboardingExit.SignedOut);
  });

  it('asks for an invite when none is remembered', async () => {
    const { flow, onExit } = await setup({ invite: false });

    await flow.load();

    expect(onExit).toHaveBeenCalledWith(OnboardingExit.InviteNeeded);
  });

  it('skips the screens for someone who already has a profile', async () => {
    const { flow, onExit } = await setup();
    await flow.load();
    await reachLastScreen(flow);
    await flow.next();
    onExit.mockClear();

    await flow.load();

    expect(onExit).toHaveBeenCalledWith(OnboardingExit.ProfileExists);
  });

  it('offers a retry when the details cannot be loaded', async () => {
    const { flow, onExit } = await setup({
      api: () => ({
        getProfile: async () => {
          throw new TypeError('Failed to fetch');
        },
      }),
    });

    await flow.load();

    expect(flow.phase.value).toBe(OnboardingPhase.Failed);
    expect(onExit).not.toHaveBeenCalled();
  });

  it('pre-fills language and units from the device', async () => {
    const { flow } = await setup({ languages: ['el-GR'] });

    expect(flow.draft.value).toMatchObject({ locale: Locale.El, units: 'metric' });
  });

  it('switches the app language when another is picked', async () => {
    const { flow, applyLocale } = await setup();

    flow.update({ field: 'locale', value: Locale.El });

    expect(flow.draft.value.locale).toBe(Locale.El);
    expect(applyLocale).toHaveBeenCalledWith(Locale.El);
  });
});

describe('useOnboarding: about you', () => {
  it('names what is missing and stays on the screen', async () => {
    const { flow } = await setup();

    await flow.next();

    expect(flow.step.value).toBe(OnboardingStep.About);
    expect(flow.errors.value).toEqual({
      needs: OnboardingMessageKey.Needs,
      birthYear: OnboardingMessageKey.BirthYear,
      country: OnboardingMessageKey.Country,
    });
  });

  it('clears the message for an answer as soon as it is changed', async () => {
    const { flow } = await setup();
    await flow.next();

    flow.update({ field: 'birthYear', value: '1990' });

    expect(flow.errors.value.birthYear).toBeUndefined();
    expect(flow.errors.value.needs).toBe(OnboardingMessageKey.Needs);
  });

  it('stops someone under 18 on this device, even without a country, and sends nothing', async () => {
    const sent: string[] = [];
    const { flow } = await setup({
      api: (base) => ({
        saveProfile: async (s) => (sent.push('save'), base.saveProfile(s)),
        checkInvite: async (c) => (sent.push('check'), base.checkInvite(c)),
      }),
    });
    set(flow, { field: 'birthYear', value: String(NOW - 10) });

    await flow.next();

    expect(flow.stop.value).toBe(ProfileRejection.UnderAge);
    expect(sent).toEqual([]);
  });

  it('stops an adult outside the EU/EEA once everything else is answered', async () => {
    const { flow } = await setup();
    answerAbout(flow, { country: 'US' });

    await flow.next();

    expect(flow.stop.value).toBe(ProfileRejection.OutsideEea);
    expect(flow.step.value).toBe(OnboardingStep.About);
  });

  it('lets the person change their answers after a stop', async () => {
    const { flow } = await setup();
    answerAbout(flow, { country: 'US' });
    await flow.next();

    flow.changeAnswers();
    flow.update({ field: 'country', value: 'GR' });
    await flow.next();

    expect(flow.stop.value).toBeUndefined();
    expect(flow.step.value).toBe(OnboardingStep.Sport);
  });
});

describe('useOnboarding: the screens', () => {
  it('goes through every screen, with progress, and saves at the end', async () => {
    const { flow, onExit } = await setup();

    answerAbout(flow);
    expect([flow.stepNumber.value, flow.stepCount.value]).toEqual([1, 4]);
    await flow.next();
    expect(flow.step.value).toBe(OnboardingStep.Sport);
    answerSport(flow);
    await flow.next();
    expect(flow.step.value).toBe(OnboardingStep.Goal);
    flow.update({ field: 'goal', value: Goal.Strength });
    await flow.next();
    expect(flow.step.value).toBe(OnboardingStep.Week);
    expect(onExit).not.toHaveBeenCalled();
    answerWeek(flow);
    await flow.next();

    expect(onExit).toHaveBeenCalledExactlyOnceWith(OnboardingExit.Finished);
  });

  it('skips the training week and saves after the Goal for food only', async () => {
    const { flow, onExit } = await setup();

    await reachLastScreen(flow, Need.Food);

    expect(flow.step.value).toBe(OnboardingStep.Goal);
    expect(flow.stepCount.value).toBe(3);
    await flow.next();
    expect(onExit).toHaveBeenCalledWith(OnboardingExit.Finished);
  });

  it('holds each screen until its answers are valid', async () => {
    const { flow } = await setup();
    answerAbout(flow);
    await flow.next();

    await flow.next();
    expect(flow.step.value).toBe(OnboardingStep.Sport);
    expect(Object.keys(flow.errors.value).sort()).toEqual(['playDays', 'playIntensity', 'sport']);

    set(flow, { field: 'sport', value: SportKind.Other });
    await flow.next();
    expect(flow.errors.value.otherSportName).toBe(OnboardingMessageKey.OtherSportName);
  });

  it('asks for as many available days as Sessions per week', async () => {
    const { flow, onExit } = await setup();
    await reachLastScreen(flow);
    set(flow, { field: 'availableDays', value: [Weekday.Mon, Weekday.Wed] });

    await flow.next();

    expect(flow.errors.value.availableDays).toBe(OnboardingMessageKey.AvailableDays);
    expect(onExit).not.toHaveBeenCalled();

    set(flow, { field: 'sessionsPerWeek', value: 2 });
    expect(flow.errors.value.availableDays).toBeUndefined();
    await flow.next();
    expect(onExit).toHaveBeenCalledWith(OnboardingExit.Finished);
  });

  it('goes back a screen and keeps the answers', async () => {
    const { flow } = await setup();
    answerAbout(flow);
    await flow.next();

    flow.back();

    expect(flow.step.value).toBe(OnboardingStep.About);
    expect(flow.draft.value.birthYear).toBe('1990');
  });
});

describe('useOnboarding: saving', () => {
  it('goes back to the invite screen when the server turns the invite down', async () => {
    const { flow, onExit, services } = await setup();
    await reachLastScreen(flow);
    services.inviteStorage.save(FAKE_INVITE.usedCode);

    await flow.next();

    expect(onExit).toHaveBeenCalledExactlyOnceWith(OnboardingExit.InviteRejected);
  });

  it('shows the stop when the server applies the age rule after all', async () => {
    const { flow, onExit } = await setup({ signedIn: true });
    await reachLastScreen(flow);
    // A clock that disagrees with the server's: the device thinks the year is earlier.
    set(flow, { field: 'birthYear', value: String(new Date().getUTCFullYear() - 10) });

    await flow.next();

    expect(flow.stop.value).toBe(ProfileRejection.UnderAge);
    expect(flow.step.value).toBe(OnboardingStep.About);
    expect(onExit).not.toHaveBeenCalled();
  });

  it('explains being offline and lets the person try again', async () => {
    const { flow, onExit, services } = await setup();
    await reachLastScreen(flow);
    let online = false;
    // The device goes offline right before the last Continue.
    Object.assign(services.network, { isOnline: () => online });

    await flow.next();
    expect(flow.errorKey.value).toBe(OnboardingMessageKey.Offline);
    expect(flow.busy.value).toBe(false);
    expect(onExit).not.toHaveBeenCalled();

    online = true;
    await flow.next();
    expect(onExit).toHaveBeenCalledWith(OnboardingExit.Finished);
  });

  it('shows the generic message for a failure it does not know', async () => {
    const { flow } = await setup({
      api: () => ({
        saveProfile: async () => {
          throw new AppError(AppErrorCode.Unknown);
        },
      }),
    });
    await reachLastScreen(flow);

    await flow.next();

    expect(flow.errorKey.value).toBe(OnboardingMessageKey.Unknown);
  });

  it('sends a person whose session ended back to the start', async () => {
    const { flow, onExit, services } = await setup();
    await reachLastScreen(flow);
    await services.auth.signOut();

    await flow.next();

    expect(onExit).toHaveBeenCalledWith(OnboardingExit.SignedOut);
  });
});
