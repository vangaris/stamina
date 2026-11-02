import {
  ProfileRejection,
  SaveProfileStatus,
  SportKind,
  getProfileResponseSchema,
  inviteCheckResponseSchema,
  saveProfileResultSchema,
  type ProfileSubmission,
} from '@stamina/contracts';
import { Goal, INVITE_CODE_INPUT_MAX_LENGTH, LaunchSport, Need, Weekday } from '@stamina/domain';
import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { appUser, invite, profile } from '../src/db/schema.ts';
import { withUser } from '../src/db/with-user.ts';
import { ApiErrorCode } from '../src/enums/api-error-code.ts';
import { HttpHeader } from '../src/enums/http-header.ts';
import { queryRows } from './support/query-rows.ts';
import {
  CURRENT_YEAR,
  foodOnlySubmission,
  issueInvite,
  omit,
  validSubmission,
} from './support/profile-fixtures.ts';
import { expectNoSentinel, SENTINELS } from './support/sentinel.ts';
import { startTestApi } from './support/test-api.ts';

/** SQLSTATE 42501: a statement or row failed the privileges or policy. */
const PG_INSUFFICIENT_PRIVILEGE = '42501';

describe('/profile', () => {
  let api: Awaited<ReturnType<typeof startTestApi>>;
  const lines: string[] = [];
  beforeAll(async () => {
    api = await startTestApi({ log: (line) => lines.push(line) });
  });
  afterAll(() => api.close());

  const newUser = async () => {
    const userId = crypto.randomUUID();
    return { userId, token: await api.signToken(userId) };
  };
  const send = (method: 'GET' | 'POST', token?: string, body?: unknown) =>
    fetch(`${api.baseUrl}/profile`, {
      method,
      headers: {
        ...(token === undefined ? {} : { [HttpHeader.Authorization]: `Bearer ${token}` }),
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  const save = (token: string, submission: ProfileSubmission) => send('POST', token, submission);
  const read = async (token: string) =>
    getProfileResponseSchema.parse(await (await send('GET', token)).json()).profile;
  const profileRows = (userId: string) =>
    api.db.select().from(profile).where(eq(profile.userId, userId));
  const inviteRow = async (code: string) =>
    (await api.db.select().from(invite).where(eq(invite.code, code)))[0]!;
  const answersOf = (submission: ProfileSubmission) => omit(submission, 'inviteCode');

  describe('without a token', () => {
    it('answers 401 to GET and POST, and stores nothing', async () => {
      const code = await issueInvite(api.db);

      const get = await send('GET');
      const post = await send('POST', undefined, validSubmission({ inviteCode: code }));

      for (const response of [get, post]) {
        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({ error: ApiErrorCode.Unauthorized });
      }
      expect((await inviteRow(code)).redeemedBy).toBeNull();
    });
  });

  describe('GET', () => {
    it('is null before onboarding', async () => {
      const { token } = await newUser();

      expect(await read(token)).toBeNull();
    });
  });

  describe('POST with an invite', () => {
    it('saves, answers with the profile, redeems the invite and reads back the same', async () => {
      const { userId, token } = await newUser();
      const code = await issueInvite(api.db);
      const submission = validSubmission({ inviteCode: code });

      const response = await save(token, submission);

      expect(response.status).toBe(200);
      const result = saveProfileResultSchema.parse(await response.json());
      expect(result).toEqual({
        status: SaveProfileStatus.Saved,
        profile: { ...answersOf(submission), hotConditionsDefault: false },
      });
      expect(await read(token)).toEqual(
        result.status === SaveProfileStatus.Saved ? result.profile : undefined,
      );
      expect(await inviteRow(code)).toMatchObject({ redeemedBy: userId });
      expect((await inviteRow(code)).redeemedAt).toBeInstanceOf(Date);
    });

    it('takes the invite as typed (lower case, hyphen)', async () => {
      const { token } = await newUser();
      const code = await issueInvite(api.db);

      const response = await save(
        token,
        validSubmission({ inviteCode: `${code.slice(0, 4)}-${code.slice(4)}`.toLowerCase() }),
      );

      expect(response.status).toBe(200);
      expect((await inviteRow(code)).redeemedBy).not.toBeNull();
    });

    it('stores a typed sport as its name, with hot conditions off', async () => {
      const { token } = await newUser();
      const submission = validSubmission({
        inviteCode: await issueInvite(api.db),
        sport: { kind: SportKind.Other, name: ' Archery ' },
      });

      await save(token, submission);

      expect(await read(token)).toMatchObject({
        sport: { kind: SportKind.Other, name: 'Archery' },
        hotConditionsDefault: false,
      });
    });

    it('turns hot conditions on for kite, windsurf and beach volleyball only', async () => {
      const hotSports: LaunchSport[] = [];
      for (const sport of Object.values(LaunchSport)) {
        const { token } = await newUser();
        await save(
          token,
          validSubmission({
            inviteCode: await issueInvite(api.db),
            sport: { kind: SportKind.Launch, sport },
          }),
        );
        if ((await read(token))?.hotConditionsDefault) hotSports.push(sport);
      }

      expect(hotSports.sort()).toEqual(
        [LaunchSport.BeachVolleyball, LaunchSport.Kitesurfing, LaunchSport.Windsurfing].sort(),
      );
    });

    it('derives hot conditions on the server and ignores what the client sends', async () => {
      const { token } = await newUser();
      const body = {
        ...validSubmission({ inviteCode: await issueInvite(api.db) }),
        hotConditionsDefault: true,
      };

      await save(token, body);

      expect(await read(token)).toMatchObject({ hotConditionsDefault: false });
    });

    it('saves food only without a training week', async () => {
      const { userId, token } = await newUser();
      const submission = foodOnlySubmission(await issueInvite(api.db));

      const response = await save(token, submission);

      expect(response.status).toBe(200);
      const saved = await read(token);
      expect(saved).toMatchObject({ needs: Need.Food });
      expect(saved).not.toHaveProperty('trainingWeek');
      expect(await profileRows(userId)).toEqual([
        expect.objectContaining({
          sessionsPerWeek: null,
          sessionMinutes: null,
          availableDays: null,
        }),
      ]);
    });

    it('saves "It varies" with no play days', async () => {
      const { token } = await newUser();

      await save(
        token,
        validSubmission({
          inviteCode: await issueInvite(api.db),
          playDays: [],
          playVaries: true,
        }),
      );

      expect(await read(token)).toMatchObject({ playDays: [], playVaries: true });
    });
  });

  describe('turned away by the rules', () => {
    const turnedAway = [
      ['a minor in the EU', { birthYear: CURRENT_YEAR - 17 }, ProfileRejection.UnderAge],
      [
        'a minor outside the EEA (age first)',
        { birthYear: CURRENT_YEAR - 15, country: 'US' },
        ProfileRejection.UnderAge,
      ],
      ['an adult in the US', { country: 'US' }, ProfileRejection.OutsideEea],
      ['an adult in the UK', { country: 'GB' }, ProfileRejection.OutsideEea],
      ['an adult in Switzerland', { country: 'CH' }, ProfileRejection.OutsideEea],
    ] as const;

    it.each(turnedAway)(
      'rejects %s with 422, stores nothing and keeps the invite',
      async (_name, overrides, reason) => {
        const { userId, token } = await newUser();
        const code = await issueInvite(api.db);

        const response = await save(token, validSubmission({ ...overrides, inviteCode: code }));

        expect(response.status).toBe(422);
        expect(saveProfileResultSchema.parse(await response.json())).toEqual({
          status: SaveProfileStatus.Rejected,
          reason,
        });
        expect(await profileRows(userId)).toEqual([]);
        expect(await read(token)).toBeNull();
        expect(await inviteRow(code)).toMatchObject({ redeemedBy: null, redeemedAt: null });
      },
    );

    it('lets the same invite be used afterwards by an eligible person', async () => {
      const code = await issueInvite(api.db);
      const minor = await newUser();
      const adult = await newUser();

      await save(minor.token, validSubmission({ birthYear: CURRENT_YEAR - 16, inviteCode: code }));
      const response = await save(adult.token, validSubmission({ inviteCode: code }));

      expect(response.status).toBe(200);
      expect((await inviteRow(code)).redeemedBy).toBe(adult.userId);
    });

    it('checks eligibility before the invite, so a minor with a bad code is told about age', async () => {
      const { token } = await newUser();

      const response = await save(
        token,
        validSubmission({ birthYear: CURRENT_YEAR - 10, inviteCode: 'ABCDEFGH23' }),
      );

      expect(await response.json()).toEqual({
        status: SaveProfileStatus.Rejected,
        reason: ProfileRejection.UnderAge,
      });
    });

    it('does not update an existing profile either', async () => {
      const { token } = await newUser();
      await save(token, validSubmission({ inviteCode: await issueInvite(api.db) }));

      const response = await save(token, validSubmission({ country: 'US', inviteCode: 'x' }));

      expect(response.status).toBe(422);
      expect(await read(token)).toMatchObject({ country: 'GR' });
    });
  });

  describe('rule boundaries', () => {
    const week = (sessionsPerWeek: number, sessionMinutes: number, days = 4) => ({
      sessionsPerWeek,
      sessionMinutes,
      availableDays: Object.values(Weekday).slice(0, days),
    });
    const statusFor = async (overrides: Partial<ProfileSubmission>) => {
      const { token } = await newUser();
      const inviteCode = await issueInvite(api.db);
      return (await save(token, validSubmission({ inviteCode, ...overrides }))).status;
    };

    it('admits someone whose age in years is 18 and turns away 17', async () => {
      expect(await statusFor({ birthYear: CURRENT_YEAR - 18 })).toBe(200);
      expect(await statusFor({ birthYear: CURRENT_YEAR - 17 })).toBe(422);
    });

    it('admits an EEA resident outside the EU', async () => {
      expect(await statusFor({ country: 'NO' })).toBe(200);
    });

    it('takes 2 to 4 sessions a week and rejects 1 and 5', async () => {
      expect(await statusFor({ trainingWeek: week(2, 45) })).toBe(200);
      expect(await statusFor({ trainingWeek: week(4, 45) })).toBe(200);
      expect(await statusFor({ trainingWeek: week(1, 45) })).toBe(400);
      expect(await statusFor({ trainingWeek: week(5, 45, 5) })).toBe(400);
    });

    it('offers 30, 45 and 60 minute sessions and rejects 50', async () => {
      for (const minutes of [30, 45, 60]) {
        expect(await statusFor({ trainingWeek: week(3, minutes) })).toBe(200);
      }
      expect(await statusFor({ trainingWeek: week(3, 50) })).toBe(400);
    });

    it('needs at least as many available days as sessions', async () => {
      expect(await statusFor({ trainingWeek: week(3, 45, 3) })).toBe(200);
      expect(await statusFor({ trainingWeek: week(3, 45, 2) })).toBe(400);
    });
  });

  describe('invite problems', () => {
    it('rejects an unknown code with 422 invite-invalid and stores nothing', async () => {
      const { userId, token } = await newUser();

      const response = await save(token, validSubmission({ inviteCode: 'ABCDEFGH23' }));

      expect(response.status).toBe(422);
      expect(await response.json()).toEqual({
        status: SaveProfileStatus.Rejected,
        reason: ProfileRejection.InviteInvalid,
      });
      expect(await profileRows(userId)).toEqual([]);
    });

    it('rejects a malformed code the same way', async () => {
      const { userId, token } = await newUser();

      for (const inviteCode of ['x', '0OIL0OIL0O', "'; drop table invite; --"]) {
        const response = await save(token, validSubmission({ inviteCode }));
        expect(response.status).toBe(422);
        expect(await response.json()).toEqual({
          status: SaveProfileStatus.Rejected,
          reason: ProfileRejection.InviteInvalid,
        });
      }
      expect(await profileRows(userId)).toEqual([]);
    });

    it('rejects a code somebody else already used, and leaves it theirs', async () => {
      const code = await issueInvite(api.db);
      const first = await newUser();
      const second = await newUser();
      await save(first.token, validSubmission({ inviteCode: code }));

      const response = await save(second.token, validSubmission({ inviteCode: code }));

      expect(response.status).toBe(422);
      expect(await response.json()).toMatchObject({ reason: ProfileRejection.InviteInvalid });
      expect(await profileRows(second.userId)).toEqual([]);
      expect((await inviteRow(code)).redeemedBy).toBe(first.userId);
    });

    it('keeps a used code used after the person who used it is deleted', async () => {
      const code = await issueInvite(api.db);
      const first = await newUser();
      const second = await newUser();
      await save(first.token, validSubmission({ inviteCode: code }));

      // Account deletion: the connection role removes the user; the profile cascades and
      // `invite.redeemed_by` is cleared.
      await api.db.delete(appUser).where(eq(appUser.id, first.userId));

      expect(await inviteRow(code)).toMatchObject({ redeemedBy: null });
      expect(
        inviteCheckResponseSchema.parse(
          await (
            await fetch(`${api.baseUrl}/invites/check`, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ code }),
            })
          ).json(),
        ),
      ).toEqual({ valid: false });
      const response = await save(second.token, validSubmission({ inviteCode: code }));
      expect(response.status).toBe(422);
      expect(await response.json()).toMatchObject({ reason: ProfileRejection.InviteInvalid });
      expect(await profileRows(second.userId)).toEqual([]);
    });

    it('lets exactly one of two people racing for one code win', async () => {
      const code = await issueInvite(api.db);
      const [a, b] = [await newUser(), await newUser()];

      const responses = await Promise.all([
        save(a.token, validSubmission({ inviteCode: code })),
        save(b.token, validSubmission({ inviteCode: code })),
      ]);

      expect(responses.map((r) => r.status).sort()).toEqual([200, 422]);
      const rows = [...(await profileRows(a.userId)), ...(await profileRows(b.userId))];
      expect(rows).toHaveLength(1);
      expect((await inviteRow(code)).redeemedBy).toBe(rows[0]!.userId);
    });

    it('lets one person saving twice at once (two tabs) use only one code', async () => {
      const { userId, token } = await newUser();
      const [one, two] = [await issueInvite(api.db), await issueInvite(api.db)];

      const responses = await Promise.all([
        save(token, validSubmission({ inviteCode: one })),
        save(token, validSubmission({ inviteCode: two })),
      ]);

      expect(responses.map((r) => r.status)).toEqual([200, 200]);
      expect(await profileRows(userId)).toHaveLength(1);
      const redeemed = [await inviteRow(one), await inviteRow(two)].filter((row) => row.redeemedBy);
      expect(redeemed).toHaveLength(1);
    });
  });

  describe('saving again', () => {
    it('updates the profile, needs no invite and consumes none', async () => {
      const { userId, token } = await newUser();
      const first = await issueInvite(api.db);
      const spare = await issueInvite(api.db);
      await save(token, validSubmission({ inviteCode: first }));
      const [before] = await profileRows(userId);

      const response = await save(
        token,
        validSubmission({
          inviteCode: spare,
          goal: Goal.Strength,
          playDays: [Weekday.Sun],
          sport: { kind: SportKind.Launch, sport: LaunchSport.Kitesurfing },
        }),
      );

      expect(response.status).toBe(200);
      expect(await read(token)).toMatchObject({
        goal: Goal.Strength,
        playDays: [Weekday.Sun],
        hotConditionsDefault: true,
      });
      const [after] = await profileRows(userId);
      expect(after!.createdAt).toEqual(before!.createdAt);
      expect(after!.updatedAt.getTime()).toBeGreaterThan(before!.updatedAt.getTime());
      expect((await inviteRow(spare)).redeemedBy).toBeNull();
      expect((await inviteRow(first)).redeemedBy).toBe(userId);
    });

    it('works with an unknown invite code', async () => {
      const { token } = await newUser();
      await save(token, validSubmission({ inviteCode: await issueInvite(api.db) }));

      const response = await save(
        token,
        validSubmission({ inviteCode: 'ABCDEFGH23', goal: Goal.Strength }),
      );

      expect(response.status).toBe(200);
      expect(await read(token)).toMatchObject({ goal: Goal.Strength });
    });

    it('drops the training week when the person switches to food only', async () => {
      const { userId, token } = await newUser();
      await save(token, validSubmission({ inviteCode: await issueInvite(api.db) }));

      await save(token, foodOnlySubmission('ABCDEFGH23'));

      expect(await read(token)).not.toHaveProperty('trainingWeek');
      expect(await profileRows(userId)).toEqual([
        expect.objectContaining({ sessionsPerWeek: null, availableDays: null }),
      ]);
    });
  });

  describe('malformed bodies', () => {
    const bad: [string, unknown][] = [
      ['not JSON', '{'],
      ['an empty object', {}],
      [
        'an unknown sport',
        validSubmission({ sport: { kind: SportKind.Launch, sport: 'golf' as LaunchSport } }),
      ],
      ['a country that does not exist', validSubmission({ country: 'XX' })],
      ['a training week with food only', validSubmission({ needs: Need.Food })],
      [
        'fewer available days than sessions',
        validSubmission({
          trainingWeek: { sessionsPerWeek: 4, sessionMinutes: 45, availableDays: [Weekday.Mon] },
        }),
      ],
      ['no invite code field', omit(validSubmission(), 'inviteCode')],
      [
        'an over-long invite code',
        validSubmission({ inviteCode: 'A'.repeat(INVITE_CODE_INPUT_MAX_LENGTH + 1) }),
      ],
      [
        'a valid invite code padded past the length bound',
        validSubmission({ inviteCode: `ABCDEFGH23${' '.repeat(INVITE_CODE_INPUT_MAX_LENGTH)}` }),
      ],
    ];

    it.each(bad)('answers 400 to %s, stores nothing and echoes nothing', async (_name, body) => {
      const { userId, token } = await newUser();
      const response = await fetch(`${api.baseUrl}/profile`, {
        method: 'POST',
        headers: {
          [HttpHeader.Authorization]: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: typeof body === 'string' ? body : JSON.stringify(body),
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: ApiErrorCode.InvalidRequest });
      expect(await profileRows(userId)).toEqual([]);
    });
  });

  describe('privacy', () => {
    it('never logs the body, and logs the route and status', async () => {
      const { token } = await newUser();
      const code = await issueInvite(api.db);
      lines.length = 0;

      await save(
        token,
        validSubmission({
          inviteCode: code,
          sport: { kind: SportKind.Other, name: SENTINELS.body },
        }),
      );

      expect(lines).toHaveLength(1);
      expect(JSON.parse(lines[0]!)).toMatchObject({ route: '/profile', status: 200 });
      expectNoSentinel(lines[0]);
      expect(lines[0]).not.toContain(code);
    });
  });

  describe('row-level security (user B cannot reach user A)', () => {
    let a: Awaited<ReturnType<typeof newUser>>;
    let b: Awaited<ReturnType<typeof newUser>>;
    beforeAll(async () => {
      [a, b] = [await newUser(), await newUser()];
      await save(
        a.token,
        validSubmission({ inviteCode: await issueInvite(api.db), goal: Goal.Strength }),
      );
      await save(
        b.token,
        validSubmission({ inviteCode: await issueInvite(api.db), goal: Goal.BodyComposition }),
      );
    });

    it('answers each user with their own profile over HTTP', async () => {
      expect(await read(a.token)).toMatchObject({ goal: Goal.Strength });
      expect(await read(b.token)).toMatchObject({ goal: Goal.BodyComposition });
    });

    it("shows B only B's row, even when asking for A's", async () => {
      const all = await withUser(api.db, b.userId, (tx) => tx.select().from(profile));
      const aFromB = await withUser(api.db, b.userId, (tx) =>
        tx.select().from(profile).where(eq(profile.userId, a.userId)),
      );

      expect(all.map((row) => row.userId)).toEqual([b.userId]);
      expect(aFromB).toEqual([]);
    });

    it("cannot change, delete or write a profile for A's ID", async () => {
      const updated = await withUser(api.db, b.userId, (tx) =>
        tx
          .update(profile)
          .set({ goal: Goal.GeneralFitness })
          .where(eq(profile.userId, a.userId))
          .returning(),
      );
      const deleted = await withUser(api.db, b.userId, (tx) =>
        tx.delete(profile).where(eq(profile.userId, a.userId)).returning(),
      );

      expect(updated).toEqual([]);
      expect(deleted).toEqual([]);
      await expect(
        withUser(api.db, b.userId, (tx) =>
          tx.insert(profile).values({ ...validProfileValues(), userId: a.userId }),
        ),
      ).rejects.toMatchObject({ cause: { code: PG_INSUFFICIENT_PRIVILEGE } });
      expect(await read(a.token)).toMatchObject({ goal: Goal.Strength });
    });

    it('lets the app role see only open or own invites, never issue or edit codes', async () => {
      const open = await issueInvite(api.db);
      const aInvite = (
        await api.db.select().from(invite).where(eq(invite.redeemedBy, a.userId))
      )[0]!;

      const asB = await withUser(api.db, b.userId, (tx) =>
        tx.select({ code: invite.code, redeemedBy: invite.redeemedBy }).from(invite),
      );
      const stealing = await withUser(api.db, b.userId, (tx) =>
        tx
          .update(invite)
          .set({ redeemedBy: b.userId })
          .where(eq(invite.code, aInvite.code))
          .returning({ code: invite.code }),
      );

      expect(asB.map((row) => row.code)).toContain(open);
      expect(asB.map((row) => row.code)).not.toContain(aInvite.code);
      expect(asB.every((row) => row.redeemedBy === null || row.redeemedBy === b.userId)).toBe(true);
      await expect(
        withUser(api.db, b.userId, (tx) => tx.insert(invite).values({ code: 'ABCDEFGH23' })),
      ).rejects.toMatchObject({ cause: { code: PG_INSUFFICIENT_PRIVILEGE } });
      await expect(
        withUser(api.db, b.userId, (tx) => tx.select({ issuer: invite.issuer }).from(invite)),
      ).rejects.toMatchObject({ cause: { code: PG_INSUFFICIENT_PRIVILEGE } });
      expect(stealing).toEqual([]);
      expect((await inviteRow(aInvite.code)).redeemedBy).toBe(a.userId);
    });

    it('forces RLS on both tables', async () => {
      const rows = await queryRows<{ relname: string; relforcerowsecurity: boolean }>(
        api.db,
        sql`select relname, relforcerowsecurity from pg_class where relname in ('profile', 'invite')`,
      );

      expect(rows.sort((x, y) => x.relname.localeCompare(y.relname))).toEqual([
        { relname: 'invite', relforcerowsecurity: true },
        { relname: 'profile', relforcerowsecurity: true },
      ]);
    });
  });

  it('keeps app_user rows creatable by the first save, before any /me call', async () => {
    const { userId, token } = await newUser();

    await save(token, validSubmission({ inviteCode: await issueInvite(api.db) }));

    expect(await api.db.select().from(appUser).where(eq(appUser.id, userId))).toHaveLength(1);
  });
});

/** Columns a forged insert needs; the values are irrelevant, the policy is what is tested. */
function validProfileValues() {
  return {
    needs: Need.Both,
    birthYear: 1990,
    country: 'GR',
    sportKind: SportKind.Launch,
    launchSport: LaunchSport.Padel,
    playDays: [Weekday.Mon],
    playVaries: false,
    playMinutes: 60,
    playIntensity: 'hard' as never,
    goal: Goal.Strength,
    locale: 'en',
    units: 'metric' as never,
    hotConditionsDefault: false,
  };
}
