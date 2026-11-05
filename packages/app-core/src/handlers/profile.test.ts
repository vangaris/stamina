import {
  Goal,
  Intensity,
  LaunchSport,
  Need,
  Units,
  Weekday,
  EEA_COUNTRY_CODES,
} from '@stamina/domain';
import { Locale } from '@stamina/i18n';
import {
  ProfileRejection,
  SaveProfileStatus,
  SportKind,
  type ProfileAnswers,
} from '@stamina/contracts';
import { describe, expect, it, vi } from 'vitest';
import {
  AppErrorCode,
  checkInvite,
  exportData,
  createServices,
  FAKE_INVITE,
  getProfile,
  ProfileStatus,
  saveProfile,
  ServicesMode,
  signOut,
  verifyEmailCode,
} from '../index.ts';
import { FAKE_AUTH } from '../config.ts';
import { setupMediator } from '../testing/setup-mediator.ts';

const EMAIL = 'ada@example.com';
const GREECE = 'GR';
const ADULT_BIRTH_YEAR = 1990;
const UNDER_18_BIRTH_YEAR = new Date().getUTCFullYear() - 10;

function answers(overrides: Partial<ProfileAnswers> = {}): ProfileAnswers {
  return {
    needs: Need.Both,
    birthYear: ADULT_BIRTH_YEAR,
    country: GREECE,
    sport: { kind: SportKind.Launch, sport: LaunchSport.Padel },
    playDays: [Weekday.Tue, Weekday.Sat],
    playVaries: false,
    playMinutes: 90,
    playIntensity: Intensity.Moderate,
    goal: Goal.SportPerformance,
    trainingWeek: {
      sessionsPerWeek: 3,
      sessionMinutes: 45,
      availableDays: [Weekday.Mon, Weekday.Wed, Weekday.Fri],
    },
    locale: Locale.En,
    units: Units.Metric,
    ...overrides,
  };
}

/** Signed in with a remembered, valid invite: the state right before the onboarding screens. */
async function signedInWithInvite() {
  const setup = setupMediator();
  await setup.mediator.send(checkInvite(FAKE_INVITE.validCode));
  await setup.mediator.send(verifyEmailCode(EMAIL, FAKE_AUTH.validCode));
  return setup;
}

describe('checkInvite through the mediator', () => {
  it('accepts a valid code however it was typed, and remembers it in canonical form', async () => {
    const { mediator, services } = setupMediator();

    const result = await mediator.send(checkInvite(' kwdm-x7pq 4r '));

    expect(result).toEqual({ valid: true });
    expect(services.inviteStorage.get()).toBe(FAKE_INVITE.validCode);
  });

  it.each([
    ['an unknown code', 'ABCDEFGHJK'],
    ['a code that was already used', FAKE_INVITE.usedCode],
    ['a code of the wrong shape', 'hello'],
    ['a code with characters outside the alphabet', 'OOOOOOOOOO'],
  ])('rejects %s and remembers nothing', async (_name, code) => {
    const { mediator, services } = setupMediator();

    expect(await mediator.send(checkInvite(code))).toEqual({ valid: false });
    expect(services.inviteStorage.get()).toBeUndefined();
  });

  it('forgets an earlier valid code when the next one typed is not valid', async () => {
    const { mediator, services } = setupMediator();
    await mediator.send(checkInvite(FAKE_INVITE.validCode));

    await mediator.send(checkInvite(FAKE_INVITE.usedCode));

    expect(services.inviteStorage.get()).toBeUndefined();
  });

  it('does not ask the API about a code that cannot be a code', async () => {
    const base = createServices({ mode: ServicesMode.Test }).api;
    const asked: string[] = [];
    const { mediator } = setupMediator({
      api: {
        ...base,
        checkInvite: async (code) => (asked.push(code), { valid: true }),
      },
    });

    await mediator.send(checkInvite('hello'));
    await mediator.send(checkInvite(' kwdm-x7pq 4r '));

    expect(asked).toEqual([FAKE_INVITE.validCode]);
  });

  it('rejects an empty code with ValidationFailed and an offline device with Offline', async () => {
    const { mediator } = setupMediator();
    await expect(mediator.send(checkInvite('   '))).rejects.toMatchObject({
      code: AppErrorCode.ValidationFailed,
    });

    const offline = setupMediator({ network: { isOnline: () => false } });
    await expect(offline.mediator.send(checkInvite(FAKE_INVITE.validCode))).rejects.toMatchObject({
      code: AppErrorCode.Offline,
    });
  });
});

describe('getProfile through the mediator', () => {
  it('says an invite is needed when there is no profile and no remembered code', async () => {
    const { mediator, services } = setupMediator();
    await services.auth.verifyEmailCode(EMAIL, FAKE_AUTH.validCode);

    expect(await mediator.send(getProfile())).toEqual({ status: ProfileStatus.InviteNeeded });
  });

  it('says onboarding can start when there is no profile but a code is remembered', async () => {
    const { mediator } = await signedInWithInvite();

    expect(await mediator.send(getProfile())).toEqual({ status: ProfileStatus.NotStarted });
  });

  it('returns the saved profile once onboarding is done', async () => {
    const { mediator } = await signedInWithInvite();
    await mediator.send(saveProfile(answers()));

    const state = await mediator.send(getProfile());

    expect(state).toMatchObject({
      status: ProfileStatus.Present,
      profile: { country: GREECE, birthYear: ADULT_BIRTH_YEAR, goal: Goal.SportPerformance },
    });
  });

  it('fails with Unauthorized when signed out', async () => {
    const { mediator } = setupMediator();

    await expect(mediator.send(getProfile())).rejects.toMatchObject({
      code: AppErrorCode.Unauthorized,
    });
  });
});

describe('saveProfile through the mediator', () => {
  it('saves the answers, derives hot conditions and uses up the remembered invite', async () => {
    const { mediator, services } = await signedInWithInvite();

    const result = await mediator.send(
      saveProfile(answers({ sport: { kind: SportKind.Launch, sport: LaunchSport.Kitesurfing } })),
    );

    expect(result).toMatchObject({
      status: SaveProfileStatus.Saved,
      profile: { hotConditionsDefault: true, country: GREECE },
    });
    expect(services.inviteStorage.get()).toBeUndefined();
  });

  it('turns hot conditions off for a launch sport that is not hot, and for "Other"', async () => {
    const padel = await signedInWithInvite();
    const padelResult = await padel.mediator.send(saveProfile(answers()));
    const other = await signedInWithInvite();
    const otherResult = await other.mediator.send(
      saveProfile(answers({ sport: { kind: SportKind.Other, name: 'Surf-ski' } })),
    );

    expect(padelResult).toMatchObject({ profile: { hotConditionsDefault: false } });
    expect(otherResult).toMatchObject({
      profile: { hotConditionsDefault: false, sport: { kind: SportKind.Other, name: 'Surf-ski' } },
    });
  });

  it('keeps the training week out of a food-only profile', async () => {
    const { mediator } = await signedInWithInvite();
    const foodOnly = answers({ needs: Need.Food });
    delete foodOnly.trainingWeek;

    const result = await mediator.send(saveProfile(foodOnly));

    expect(result).toMatchObject({ status: SaveProfileStatus.Saved });
    expect(result).not.toHaveProperty('profile.trainingWeek');
  });

  it('turns away someone under 18 with a typed result, stores nothing and keeps the invite for later', async () => {
    const { mediator, services } = await signedInWithInvite();

    const result = await mediator.send(saveProfile(answers({ birthYear: UNDER_18_BIRTH_YEAR })));

    expect(result).toEqual({
      status: SaveProfileStatus.Rejected,
      reason: ProfileRejection.UnderAge,
    });
    expect(await mediator.send(getProfile())).toEqual({ status: ProfileStatus.NotStarted });
    expect(services.inviteStorage.get()).toBe(FAKE_INVITE.validCode);
    expect(await mediator.send(saveProfile(answers()))).toMatchObject({
      status: SaveProfileStatus.Saved,
    });
  });

  it('checks age before country: a minor outside the EEA is just under 18', async () => {
    const { mediator } = await signedInWithInvite();

    const result = await mediator.send(
      saveProfile(answers({ birthYear: UNDER_18_BIRTH_YEAR, country: 'US' })),
    );

    expect(result).toMatchObject({ reason: ProfileRejection.UnderAge });
  });

  it('turns away a resident outside the EU/EEA, stores nothing and does not burn the invite', async () => {
    const { mediator, services } = await signedInWithInvite();
    expect(EEA_COUNTRY_CODES).not.toContain('US');

    const result = await mediator.send(saveProfile(answers({ country: 'US' })));

    expect(result).toEqual({
      status: SaveProfileStatus.Rejected,
      reason: ProfileRejection.OutsideEea,
    });
    expect(await mediator.send(getProfile())).toEqual({ status: ProfileStatus.NotStarted });
    expect(services.inviteStorage.get()).toBe(FAKE_INVITE.validCode);
  });

  it('passes TooManySportRequests on, storing nothing and keeping the invite for another try', async () => {
    const { mediator, services } = setupMediator();
    vi.spyOn(services.api, 'saveProfile').mockResolvedValue({
      status: SaveProfileStatus.Rejected,
      reason: ProfileRejection.TooManySportRequests,
    });
    await mediator.send(checkInvite(FAKE_INVITE.validCode));
    await mediator.send(verifyEmailCode(EMAIL, FAKE_AUTH.validCode));

    const result = await mediator.send(
      saveProfile(answers({ sport: { kind: SportKind.Other, name: 'Roundnet' } })),
    );

    expect(result).toEqual({
      status: SaveProfileStatus.Rejected,
      reason: ProfileRejection.TooManySportRequests,
    });
    expect(services.inviteStorage.get()).toBe(FAKE_INVITE.validCode);
  });

  it('exports the sport asked for, and gives it up on a rename', async () => {
    const { mediator, services } = await signedInWithInvite();
    await mediator.send(
      saveProfile(answers({ sport: { kind: SportKind.Other, name: 'Roundnet' } })),
    );
    // The first save used the invite up; the handler sends the remembered one with every save.
    services.inviteStorage.save(FAKE_INVITE.validCode);
    await mediator.send(
      saveProfile(answers({ sport: { kind: SportKind.Other, name: 'Kabaddi' } })),
    );

    expect((await mediator.send(exportData())).sportRequests).toMatchObject([{ name: 'Kabaddi' }]);
  });

  it('rejects with InviteInvalid, without calling the API, when no invite is remembered', async () => {
    const base = createServices({ mode: ServicesMode.Test }).api;
    let calls = 0;
    const { mediator, services } = setupMediator({
      api: {
        ...base,
        saveProfile: async (submission) => (calls++, base.saveProfile(submission)),
      },
    });
    await services.auth.verifyEmailCode(EMAIL, FAKE_AUTH.validCode);

    const result = await mediator.send(saveProfile(answers()));

    expect(result).toEqual({
      status: SaveProfileStatus.Rejected,
      reason: ProfileRejection.InviteInvalid,
    });
    expect(calls).toBe(0);
  });

  it('rejects a code someone else already redeemed and forgets it', async () => {
    const { mediator, services } = await signedInWithInvite();
    await mediator.send(saveProfile(answers()));
    await mediator.send(signOut());
    await mediator.send(verifyEmailCode('grace@example.com', FAKE_AUTH.validCode));
    services.inviteStorage.save(FAKE_INVITE.validCode);

    const result = await mediator.send(saveProfile(answers()));

    expect(result).toEqual({
      status: SaveProfileStatus.Rejected,
      reason: ProfileRejection.InviteInvalid,
    });
    expect(services.inviteStorage.get()).toBeUndefined();
  });

  it.each([
    ['a birth year before 1900', answers({ birthYear: 1850 })],
    ['a country that does not exist', answers({ country: 'ZZ' })],
    ['a food-only profile that still has a training week', answers({ needs: Need.Food })],
    [
      'sessions per week outside 2 to 4',
      answers({
        trainingWeek: {
          sessionsPerWeek: 7,
          sessionMinutes: 45,
          availableDays: Object.values(Weekday),
        },
      }),
    ],
    ['both play days and "It varies"', answers({ playVaries: true })],
  ])('rejects %s with ValidationFailed before the API is called', async (_name, invalid) => {
    const base = createServices({ mode: ServicesMode.Test }).api;
    let calls = 0;
    const { mediator } = setupMediator({
      api: { ...base, saveProfile: async (s) => (calls++, base.saveProfile(s)) },
    });

    await expect(mediator.send(saveProfile(invalid))).rejects.toMatchObject({
      code: AppErrorCode.ValidationFailed,
    });
    expect(calls).toBe(0);
  });

  it('fails with Offline when the device is offline', async () => {
    const { mediator } = setupMediator({ network: { isOnline: () => false } });

    await expect(mediator.send(saveProfile(answers()))).rejects.toMatchObject({
      code: AppErrorCode.Offline,
    });
  });

  it('never lets an answer or the invite code reach the logger', async () => {
    const { mediator, logLines } = await signedInWithInvite();

    await mediator.send(
      saveProfile(answers({ sport: { kind: SportKind.Other, name: 'Zorbing' } })),
    );
    await mediator.send(getProfile());
    await mediator.send(saveProfile(answers({ birthYear: 1850 }))).catch(() => undefined);

    const logged = JSON.stringify(logLines);
    for (const secret of [
      'Zorbing',
      String(ADULT_BIRTH_YEAR),
      GREECE,
      FAKE_INVITE.validCode,
      '1850',
    ]) {
      expect(logged).not.toContain(secret);
    }
    for (const line of logLines) {
      expect(Object.keys(line).sort()).toEqual(['durationMs', 'outcome', 'requestType']);
    }
  });
});
