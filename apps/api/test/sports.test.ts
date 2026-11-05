import {
  ApiPath,
  ProfileRejection,
  SaveProfileStatus,
  saveProfileResultSchema,
  SportKind,
  sportListResponseSchema,
  type CatalogSport,
  type LaunchSportData,
} from '@stamina/contracts';
import {
  LaunchSport,
  MAX_SPORT_REQUESTS_PER_USER,
  SPORT_NORMALIZED_NAME_MAX_LENGTH,
  SportStatus,
} from '@stamina/domain';
import { eq, sql } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { appUser, sport } from '../src/db/schema.ts';
import { withUser } from '../src/db/with-user.ts';
import { ApiErrorCode } from '../src/enums/api-error-code.ts';
import { HttpHeader } from '../src/enums/http-header.ts';
import { requestSport, TooManySportRequestsError } from '../src/sports/index.ts';
import { draftSportProfile, loadLaunchSports } from '../src/sports/node.ts';
import { FIXTURE_LIBRARY_DIR } from './support/exercise-library-dir.ts';
import { queryRows } from './support/query-rows.ts';
import { issueInvite, validSubmission } from './support/profile-fixtures.ts';
import { PG_INSUFFICIENT_PRIVILEGE, type TestApi } from './support/safety-fixtures.ts';
import { createScratchDatabase, type ScratchDatabase } from './support/scratch-database.ts';
import { FIXTURE_SPORT_DIR } from './support/sport-data-dir.ts';
import { startTestApi } from './support/test-api.ts';

/** SQLSTATE 23514: a check constraint failed. */
const PG_CHECK_VIOLATION = '23514';
const FOUNDER = 'Vang';

describe('sports', () => {
  let api: TestApi;
  let scratch: ScratchDatabase;
  let launch: LaunchSportData[];
  const lines: string[] = [];

  beforeAll(async () => {
    launch = await loadLaunchSports(FIXTURE_SPORT_DIR);
    scratch = await createScratchDatabase(FIXTURE_LIBRARY_DIR);
    api = await startTestApi({ databaseUrl: scratch.url, log: (line) => lines.push(line) });
  });
  afterAll(async () => {
    await api.close();
    await scratch.drop();
  });
  afterEach(() => vi.restoreAllMocks());

  const newUser = async () => {
    const userId = crypto.randomUUID();
    return { userId, token: await api.signToken(userId) };
  };
  type User = Awaited<ReturnType<typeof newUser>>;

  const get = (token?: string) =>
    fetch(`${api.baseUrl}${ApiPath.Sports}`, {
      headers: token === undefined ? {} : { [HttpHeader.Authorization]: `Bearer ${token}` },
    });
  const listFor = async (user: User): Promise<CatalogSport[]> => {
    const response = await get(user.token);
    expect(response.status).toBe(200);
    return sportListResponseSchema.parse(await response.json()).sports;
  };
  const namesFor = async (user: User) => (await listFor(user)).map((s) => s.name);

  /** Onboards the user through the API with the given sport. */
  const onboard = async (user: User, sportAnswer: unknown, inviteCode?: string) => {
    const response = await fetch(`${api.baseUrl}${ApiPath.Profile}`, {
      method: 'POST',
      headers: {
        [HttpHeader.Authorization]: `Bearer ${user.token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(
        validSubmission({
          sport: sportAnswer as never,
          inviteCode: inviteCode ?? (await issueInvite(api.db)),
        }),
      ),
    });
    return { status: response.status, body: saveProfileResultSchema.parse(await response.json()) };
  };
  /** The status of a save whose body the API may refuse as invalid (400), with nothing parsed. */
  const onboardStatus = async (user: User, name: string) =>
    (
      await fetch(`${api.baseUrl}${ApiPath.Profile}`, {
        method: 'POST',
        headers: {
          [HttpHeader.Authorization]: `Bearer ${user.token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(
          validSubmission({
            sport: { kind: SportKind.Other, name } as never,
            inviteCode: await issueInvite(api.db),
          }),
        ),
      })
    ).status;
  /** Asks for a sport straight through the SQL function, as the user (no profile save). */
  const askDirectly = async (user: User, name: string) => {
    await api.db.insert(appUser).values({ id: user.userId }).onConflictDoNothing();
    return withUser(api.db, user.userId, (tx) => requestSport(tx, name));
  };
  const requestOther = async (user: User, name: string) => {
    const result = await onboard(user, { kind: SportKind.Other, name });
    expect(result.body.status).toBe(SaveProfileStatus.Saved);
  };

  const rowByName = async (normalized: string) =>
    (await api.db.select().from(sport).where(eq(sport.normalizedName, normalized)))[0];
  const count = async (query: ReturnType<typeof sql>) =>
    (await queryRows<{ n: number }>(api.db, query))[0]!.n;
  const sportCount = () => count(sql`select count(*)::int as n from sport`);
  const requestCount = (userId: string) =>
    count(sql`select count(*)::int as n from sport_request where user_id = ${userId}`);

  /** What the founder does in the table editor: an owner-level update. */
  const approve = (id: string, profileOf: LaunchSportData = launch[0]!) =>
    api.db
      .update(sport)
      .set({
        status: SportStatus.Approved,
        profile: profileOf.profile,
        sources: profileOf.sources,
        approvedBy: FOUNDER,
        approvedAt: new Date(),
        version: sql`${sport.version} + 1`,
      })
      .where(eq(sport.id, id));

  describe('GET /sports', () => {
    it('answers 401 without a token', async () => {
      const response = await get();
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: ApiErrorCode.Unauthorized });
    });

    it('shows nobody the launch sports while they are drafts', async () => {
      const user = await newUser();
      expect(await listFor(user)).toEqual([]);
      const seeded = await queryRows<{ id: string; status: string }>(
        api.db,
        sql`select id, status from sport where id in (${sql.join(
          Object.values(LaunchSport).map((id) => sql`${id}`),
          sql`, `,
        )})`,
      );
      expect(seeded).toHaveLength(Object.values(LaunchSport).length);
      expect(new Set(seeded.map((row) => row.status))).toEqual(new Set([SportStatus.Draft]));
    });

    it('shows an approved launch sport to everyone, not labelled beta, with its profile and version', async () => {
      const [a, b] = [await newUser(), await newUser()];
      const padel = launch.find((s) => s.id === LaunchSport.Padel)!;
      await approve(LaunchSport.Padel, padel);

      for (const user of [a, b]) {
        expect(await listFor(user)).toEqual([
          {
            id: LaunchSport.Padel,
            name: padel.name,
            status: SportStatus.Approved,
            beta: false,
            profile: padel.profile,
            sources: padel.sources,
            version: 2,
          },
        ]);
      }
      // Put the shared fixture back for the tests below.
      await api.db
        .update(sport)
        .set({ status: SportStatus.Draft, approvedBy: null, approvedAt: null, version: 1 })
        .where(eq(sport.id, LaunchSport.Padel));
    });
  });

  describe('a requested sport', () => {
    it('is visible to its requester only, as a draft labelled beta with no profile yet', async () => {
      const [requester, other] = [await newUser(), await newUser()];
      await requestOther(requester, 'Beach Tennis');

      const [seen] = await listFor(requester);
      expect(seen).toMatchObject({
        name: 'Beach Tennis',
        status: SportStatus.Draft,
        beta: true,
        profile: null,
        sources: null,
        version: 1,
      });
      expect(await listFor(other)).toEqual([]);
    });

    it('is one sport for every spelling of the name, and each requester sees it', async () => {
      const [first, second] = [await newUser(), await newUser()];
      await requestOther(first, 'Ultimate Frisbee');
      await requestOther(second, '  ULTIMATE   frisbee ');
      await requestOther(await newUser(), 'Ultimaté Frisbee');

      const rows = await api.db
        .select()
        .from(sport)
        .where(eq(sport.normalizedName, 'ultimate frisbee'));
      expect(rows).toHaveLength(1);
      // The first spelling names the sport.
      expect(rows[0]?.name).toBe('Ultimate Frisbee');
      for (const user of [first, second]) {
        expect((await listFor(user)).map((s) => s.id)).toEqual([rows[0]!.id]);
      }
      expect(
        await count(
          sql`select count(*)::int as n from sport_request where sport_id = ${rows[0]!.id}`,
        ),
      ).toBe(3);
    });

    it('shows the drafted profile to its requester, still beta, once draft-sport has run', async () => {
      const [requester, other] = [await newUser(), await newUser()];
      await requestOther(requester, 'Roundnet');
      api.ai.queue({ profile: launch[3]!.profile, sources: launch[3]!.sources });

      await draftSportProfile(api.db, api.ai.provider, (await rowByName('roundnet'))!.id);

      expect(await listFor(requester)).toMatchObject([
        { name: 'Roundnet', status: SportStatus.Draft, beta: true, profile: launch[3]!.profile },
      ]);
      expect(await namesFor(other)).not.toContain('Roundnet');
    });

    it('becomes visible to everyone, not labelled beta, once approved', async () => {
      const [requester, other] = [await newUser(), await newUser()];
      await requestOther(requester, 'Pickleball');
      expect(await namesFor(other)).not.toContain('Pickleball');

      await approve((await rowByName('pickleball'))!.id, launch[1]!);

      for (const user of [requester, other]) {
        const found = (await listFor(user)).find((s) => s.name === 'Pickleball');
        expect(found).toMatchObject({ status: SportStatus.Approved, beta: false, version: 2 });
        expect(found?.profile).toEqual(launch[1]!.profile);
      }
    });

    it('is visible to nobody once rejected, not even its requester', async () => {
      const requester = await newUser();
      await requestOther(requester, 'Quidditch');
      expect(await namesFor(requester)).toContain('Quidditch');

      await api.db
        .update(sport)
        .set({ status: SportStatus.Rejected })
        .where(eq(sport.normalizedName, 'quidditch'));

      expect(await namesFor(requester)).not.toContain('Quidditch');
      expect(await namesFor(await newUser())).not.toContain('Quidditch');
    });

    it('is listed by name, together with the approved sports', async () => {
      const user = await newUser();
      await requestOther(user, 'Aardvark Racing');
      await requestOther(user, 'Zorb Football');
      const names = await namesFor(user);
      expect(names.indexOf('Aardvark Racing')).toBeLessThan(names.indexOf('Zorb Football'));
    });

    it('is left out, and logged by id without its content, when its stored profile is no longer valid', async () => {
      const user = await newUser();
      await requestOther(user, 'Broken Sport');
      const id = (await rowByName('broken sport'))!.id;
      const secret = 'SPORT-CONTENT-NEVER-LOGGED';
      await api.db
        .update(sport)
        .set({ profile: { [secret]: 1 } as never })
        .where(eq(sport.id, id));
      const logged: string[] = [];
      vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
        logged.push(args.map(String).join(' '));
      });

      expect(await namesFor(user)).not.toContain('Broken Sport');
      expect(logged.join('\n')).toContain(id);
      expect(logged.join('\n')).not.toContain(secret);
    });

    it('never puts sport JSON in the request log', async () => {
      const user = await newUser();
      await requestOther(user, 'Logged Sport');
      await approve((await rowByName('logged sport'))!.id, launch[2]!);
      await listFor(user);
      const text = lines.join('\n');
      expect(text).toContain('/sports');
      expect(text).not.toContain(launch[2]!.sources[0]!.url);
      expect(text).not.toContain('energyMix');
    });
  });

  describe('save profile', () => {
    it('creates exactly one sport and one request for an Other sport', async () => {
      const user = await newUser();
      const before = await sportCount();
      await requestOther(user, 'Disc Golf');
      await requestOther(user, 'disc golf');

      expect(await sportCount()).toBe(before + 1);
      expect(await requestCount(user.userId)).toBe(1);
    });

    it('gives the earlier request up on a rename when nobody else asked and nothing was drafted', async () => {
      const user = await newUser();
      await requestOther(user, 'Sepak Takraw');
      await requestOther(user, 'Kabaddi');

      expect(await rowByName('sepak takraw')).toBeUndefined();
      expect(await requestCount(user.userId)).toBe(1);
      const names = await namesFor(user);
      expect(names).toContain('Kabaddi');
      expect(names).not.toContain('Sepak Takraw');
    });

    it('keeps the earlier sport for the others who asked, and when a profile was drafted for it', async () => {
      const [user, other] = [await newUser(), await newUser()];
      await requestOther(user, 'Shared Rename');
      await requestOther(other, 'Shared Rename');
      await requestOther(user, 'Rename Target');
      expect(await rowByName('shared rename')).toBeDefined();
      expect(await namesFor(other)).toContain('Shared Rename');

      const drafted = await newUser();
      await requestOther(drafted, 'Drafted Rename');
      await api.db
        .update(sport)
        .set({ profile: launch[0]!.profile, sources: launch[0]!.sources })
        .where(eq(sport.normalizedName, 'drafted rename'));
      await requestOther(drafted, 'Drafted Rename Target');
      expect(await rowByName('drafted rename')).toBeDefined();
    });

    it('gives the request up when the person switches to a launch sport, and not when only the spelling changes', async () => {
      const user = await newUser();
      await requestOther(user, 'Switch Sport');
      await requestOther(user, ' SWITCH   sport ');
      expect(await rowByName('switch sport')).toBeDefined();

      const result = await onboard(user, { kind: SportKind.Launch, sport: LaunchSport.Padel });
      expect(result.body.status).toBe(SaveProfileStatus.Saved);
      expect(await rowByName('switch sport')).toBeUndefined();
      expect(await requestCount(user.userId)).toBe(0);
    });

    it('creates nothing for a launch sport', async () => {
      const user = await newUser();
      const before = await sportCount();
      const result = await onboard(user, { kind: SportKind.Launch, sport: LaunchSport.Padel });

      expect(result.body.status).toBe(SaveProfileStatus.Saved);
      expect(await sportCount()).toBe(before);
      expect(await requestCount(user.userId)).toBe(0);
    });

    it('creates nothing when the save is rejected', async () => {
      const user = await newUser();
      const before = await sportCount();
      const result = await onboard(
        user,
        { kind: SportKind.Other, name: 'Rejected Save Sport' },
        'WRONGCODE2',
      );

      expect(result.body.status).toBe(SaveProfileStatus.Rejected);
      expect(await sportCount()).toBe(before);
      expect(await requestCount(user.userId)).toBe(0);
    });
  });

  describe('the limit on requests', () => {
    const names = (prefix: string) =>
      Array.from({ length: MAX_SPORT_REQUESTS_PER_USER }, (_, i) => `${prefix} ${i + 1}`);

    it('lets a person hold the limit of requests on unapproved sports, and refuses the next with 422', async () => {
      const [user, other] = [await newUser(), await newUser()];
      // Shared, so the rename below does not give it up and free a place.
      await requestOther(other, 'Limit Profile');
      await requestOther(user, 'Limit Profile');
      for (const name of names('Limit Direct').slice(1)) await askDirectly(user, name);
      expect(await requestCount(user.userId)).toBe(MAX_SPORT_REQUESTS_PER_USER);
      const before = await sportCount();

      const result = await onboard(user, { kind: SportKind.Other, name: 'Limit Sixth' });

      expect(result.status).toBe(422);
      expect(result.body).toEqual({
        status: SaveProfileStatus.Rejected,
        reason: ProfileRejection.TooManySportRequests,
      });
      expect(await sportCount()).toBe(before);
      expect(await rowByName('limit sixth')).toBeUndefined();
      expect(await requestCount(user.userId)).toBe(MAX_SPORT_REQUESTS_PER_USER);
    });

    it('raises SP001 from the function at the limit, and asking again for a sport already asked for is free', async () => {
      const user = await newUser();
      const asked = names('Limit Function');
      for (const name of asked) await askDirectly(user, name);

      expect(await askDirectly(user, asked[0]!.toUpperCase())).toBe(
        (await rowByName(asked[0]!.toLowerCase()))!.id,
      );
      await expect(askDirectly(user, 'Limit Function Extra')).rejects.toBeInstanceOf(
        TooManySportRequestsError,
      );
      expect(await rowByName('limit function extra')).toBeUndefined();
    });

    it('raises SQLSTATE SP001 itself at the limit', async () => {
      const user = await newUser();
      for (const name of names('Limit Sqlstate')) await askDirectly(user, name);

      await expect(
        withUser(api.db, user.userId, (tx) =>
          tx.execute(sql`select request_sport('Limit Sqlstate Extra', 'limit sqlstate extra')`),
        ),
      ).rejects.toMatchObject({ cause: { code: 'SP001' } });
    });

    it('does not count approved sports, and counts a rejected one', async () => {
      const user = await newUser();
      const asked = names('Limit Count');
      for (const name of asked) await askDirectly(user, name);
      await approve((await rowByName('limit count 1'))!.id, launch[1]!);

      await askDirectly(user, 'Limit Count Sixth');
      await expect(askDirectly(user, 'Limit Count Seventh')).rejects.toBeInstanceOf(
        TooManySportRequestsError,
      );
      await api.db
        .update(sport)
        .set({ status: SportStatus.Rejected })
        .where(eq(sport.normalizedName, 'limit count 2'));
      await expect(askDirectly(user, 'Limit Count Seventh')).rejects.toBeInstanceOf(
        TooManySportRequestsError,
      );
    });

    it('lets a rename at the limit through, because the earlier request is given up first', async () => {
      const user = await newUser();
      await requestOther(user, 'Rename At Limit');
      for (const name of names('Limit Rename').slice(1)) await askDirectly(user, name);
      expect(await requestCount(user.userId)).toBe(MAX_SPORT_REQUESTS_PER_USER);

      const result = await onboard(user, { kind: SportKind.Other, name: 'Rename Landed' });

      expect(result.body.status).toBe(SaveProfileStatus.Saved);
      expect(await rowByName('rename at limit')).toBeUndefined();
      expect(await requestCount(user.userId)).toBe(MAX_SPORT_REQUESTS_PER_USER);
    });
  });

  describe('a launch sport typed under Other', () => {
    it.each(['Padel', 'ＰＡＤＥＬ', ' padel  '])(
      'does not expose the unreviewed draft and creates nothing (%s)',
      async (typed) => {
        const user = await newUser();
        const before = await sportCount();

        const result = await onboard(user, { kind: SportKind.Other, name: typed });

        expect(result.body.status).toBe(SaveProfileStatus.Saved);
        expect((await listFor(user)).filter((s) => s.id === LaunchSport.Padel)).toEqual([]);
        expect(await sportCount()).toBe(before);
        expect(await requestCount(user.userId)).toBe(0);
      },
    );

    it('joins the launch sport once it is approved', async () => {
      const user = await newUser();
      await approve(
        LaunchSport.Padel,
        launch.find((s) => s.id === LaunchSport.Padel)!,
      );
      try {
        await requestOther(user, 'Padel');
        expect(await requestCount(user.userId)).toBe(1);
      } finally {
        await api.db
          .update(sport)
          .set({ status: SportStatus.Draft, approvedBy: null, approvedAt: null, version: 1 })
          .where(eq(sport.id, LaunchSport.Padel));
      }
    });
  });

  describe('names', () => {
    it.each([
      ['a combining mark only', '\u0301'],
      ['combining marks only', '\u0301\u0302'],
      ['a zero-width space', '\u200b'],
      ['a name with a zero-width space inside', 'Pad\u200bel Fan'],
      ['a bidi control', 'Padel\u202e'],
      ['a newline', 'Beach\nTennis'],
      ['a tab', 'Beach\tTennis'],
      ['a hangul filler', '\u3164'],
    ])('refuses %s with 400 and creates nothing', async (_label, name) => {
      const user = await newUser();
      const before = await sportCount();

      expect(await onboardStatus(user, name)).toBe(400);

      expect(await sportCount()).toBe(before);
    });

    it('stores the name with its inner spaces collapsed', async () => {
      await requestOther(await newUser(), 'Roller   Derby  ');
      expect((await rowByName('roller derby'))?.name).toBe('Roller Derby');
    });

    it.each([
      ['an empty normalized name', ''],
      ['a normalized name over the bound', 'x'.repeat(SPORT_NORMALIZED_NAME_MAX_LENGTH + 1)],
    ])('is refused by the database for %s', async (_label, normalized) => {
      await expect(
        api.db.execute(
          sql`insert into sport (id, name, normalized_name, status) values ('probe-name', 'X', ${normalized}, 'draft')`,
        ),
      ).rejects.toMatchObject({ cause: { code: PG_CHECK_VIOLATION } });
    });
  });

  describe('two people asking at once', () => {
    it('share one sport, one request each', async () => {
      const users = await Promise.all(Array.from({ length: 4 }, newUser));

      await Promise.all(users.map((user) => requestOther(user, 'Concurrent Sport')));

      const rows = await api.db
        .select()
        .from(sport)
        .where(eq(sport.normalizedName, 'concurrent sport'));
      expect(rows).toHaveLength(1);
      expect(
        await count(
          sql`select count(*)::int as n from sport_request where sport_id = ${rows[0]!.id}`,
        ),
      ).toBe(users.length);
    });
  });

  describe('what the app role may do', () => {
    const owned = async (user: User, run: Parameters<typeof withUser>[2]) =>
      withUser(api.db, user.userId, run);
    const seed = async (user: User, name: string) => {
      await requestOther(user, name);
      return (await rowByName(name.toLowerCase()))!.id;
    };

    it('cannot insert, update or delete a sport', async () => {
      const user = await newUser();
      const id = await seed(user, 'Locked Sport');

      await expect(
        owned(user, (tx) =>
          tx.execute(
            sql`insert into sport (id, name, normalized_name, status) values ('x', 'X', 'x', 'draft')`,
          ),
        ),
      ).rejects.toMatchObject({ cause: { code: PG_INSUFFICIENT_PRIVILEGE } });
      await expect(
        owned(user, (tx) => tx.execute(sql`update sport set status = 'rejected' where id = ${id}`)),
      ).rejects.toMatchObject({ cause: { code: PG_INSUFFICIENT_PRIVILEGE } });
      await expect(
        owned(user, (tx) => tx.execute(sql`delete from sport where id = ${id}`)),
      ).rejects.toMatchObject({ cause: { code: PG_INSUFFICIENT_PRIVILEGE } });
      expect((await rowByName('locked sport'))?.status).toBe(SportStatus.Draft);
    });

    it('cannot update or delete a request, nor insert one for someone else', async () => {
      const [user, other] = [await newUser(), await newUser()];
      const id = await seed(user, 'Request Probe');
      await seed(other, 'Request Probe');

      await expect(
        owned(user, (tx) =>
          tx.execute(
            sql`update sport_request set user_id = ${other.userId} where sport_id = ${id}`,
          ),
        ),
      ).rejects.toMatchObject({ cause: { code: PG_INSUFFICIENT_PRIVILEGE } });
      await expect(
        owned(user, (tx) => tx.execute(sql`delete from sport_request where sport_id = ${id}`)),
      ).rejects.toMatchObject({ cause: { code: PG_INSUFFICIENT_PRIVILEGE } });
      await expect(
        owned(user, (tx) =>
          tx.execute(
            sql`insert into sport_request (sport_id, user_id) values (${id}, ${crypto.randomUUID()})`,
          ),
        ),
      ).rejects.toMatchObject({ cause: { code: PG_INSUFFICIENT_PRIVILEGE } });
    });

    it('cannot insert into sport_request at all, not even for itself, so no draft can be joined directly', async () => {
      const user = await newUser();
      await api.db.insert(appUser).values({ id: user.userId });

      for (const id of [LaunchSport.Padel, 'no-such-sport']) {
        await expect(
          owned(user, (tx) =>
            tx.execute(
              sql`insert into sport_request (sport_id, user_id) values (${id}, ${user.userId})`,
            ),
          ),
        ).rejects.toMatchObject({ cause: { code: PG_INSUFFICIENT_PRIVILEGE } });
      }
      expect((await listFor(user)).filter((s) => s.id === LaunchSport.Padel)).toEqual([]);
    });

    it('reads only its own requests', async () => {
      const [user, other] = [await newUser(), await newUser()];
      await seed(user, 'Own Request A');
      await seed(other, 'Own Request B');
      const rows = await owned(user, (tx) => tx.execute(sql`select user_id from sport_request`));
      expect((rows as unknown as { rows: { user_id: string }[] }).rows).toEqual([
        { user_id: user.userId },
      ]);
    });

    it('request_sport always acts for the caller: it neither creates nor reveals a request for anyone else', async () => {
      const [owner, joiner] = [await newUser(), await newUser()];
      const id = await seed(owner, 'Function Probe');
      await api.db.insert(appUser).values({ id: joiner.userId });

      const returned = await owned(joiner, async (tx) => {
        const result = await tx.execute(
          sql`select request_sport('function  probe', 'function probe') as id`,
        );
        return (result as unknown as { rows: { id: string }[] }).rows[0]!.id;
      });

      expect(returned).toBe(id);
      const requesters = await queryRows<{ user_id: string }>(
        api.db,
        sql`select user_id from sport_request where sport_id = ${id} order by user_id`,
      );
      expect(requesters.map((row) => row.user_id).sort()).toEqual(
        [owner.userId, joiner.userId].sort(),
      );
      // The function has no way to name another user, and a caller outside any user is refused.
      await expect(
        api.db.transaction(async (tx) => {
          await tx.execute(sql.raw('set local role stamina_app'));
          await tx.execute(sql`select request_sport('Nobody Sport', 'nobody sport')`);
        }),
      ).rejects.toMatchObject({ cause: { code: PG_INSUFFICIENT_PRIVILEGE } });
      expect(await rowByName('nobody sport')).toBeUndefined();
    });

    it('cannot run request_sport as the public role', async () => {
      await expect(
        api.db.transaction(async (tx) => {
          await tx.execute(sql`create role sport_probe nologin`);
          await tx.execute(sql`set local role sport_probe`);
          await tx.execute(sql`select request_sport('Public Sport', 'public sport')`);
        }),
      ).rejects.toMatchObject({ cause: { code: PG_INSUFFICIENT_PRIVILEGE } });
    });
  });

  describe('table constraints (owner writes)', () => {
    const base = { id: 'probe', name: 'Probe', normalizedName: 'probe' };
    const insert = (values: Record<string, unknown>) =>
      api.db.insert(sport).values({ ...base, status: SportStatus.Draft, ...values });
    const remove = () => api.db.delete(sport).where(eq(sport.id, 'probe'));

    it('accepts a complete approved sport', async () => {
      await insert({
        status: SportStatus.Approved,
        profile: launch[0]!.profile,
        sources: launch[0]!.sources,
        approvedBy: FOUNDER,
        approvedAt: new Date(),
      });
      await remove();
    });

    it.each([
      ['an approved sport without a profile', { sources: 'sources' }],
      ['an approved sport without sources', { profile: 'profile' }],
      ['an approved sport without approved_by', { approvedBy: null }],
      ['an approved sport without approved_at', { approvedAt: null }],
    ])('rejects %s', async (_name, missing) => {
      const complete = {
        status: SportStatus.Approved,
        profile: launch[0]!.profile,
        sources: launch[0]!.sources,
        approvedBy: FOUNDER,
        approvedAt: new Date(),
      };
      const values: Record<string, unknown> = { ...complete };
      if ('sources' in missing) values.profile = null;
      if ('profile' in missing) values.sources = null;
      if ('approvedBy' in missing) values.approvedBy = null;
      if ('approvedAt' in missing) values.approvedAt = null;
      await expect(insert(values)).rejects.toMatchObject({ cause: { code: PG_CHECK_VIOLATION } });
    });

    it('rejects approving an undrafted sport', async () => {
      await insert({});
      await expect(
        api.db
          .update(sport)
          .set({ status: SportStatus.Approved, approvedBy: FOUNDER, approvedAt: new Date() })
          .where(eq(sport.id, 'probe')),
      ).rejects.toMatchObject({ cause: { code: PG_CHECK_VIOLATION } });
      await remove();
    });

    it.each([
      ['an unknown status', { status: 'maybe' }],
      ['an empty name', { name: '' }],
      ['a name over the length bound', { name: 'x'.repeat(61) }],
    ])('rejects %s', async (_name, values) => {
      await expect(insert(values)).rejects.toMatchObject({ cause: { code: PG_CHECK_VIOLATION } });
    });
  });
});
