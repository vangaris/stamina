import {
  ApiPath,
  CheckinSubpath,
  HttpMethod,
  RecordStatus,
  checkinPath,
  userExportSchema,
} from '@stamina/contracts';
import { MAX_CHECKIN_SCORE, MIN_CHECKIN_SCORE } from '@stamina/domain';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { checkin } from '../src/db/schema.ts';
import type { UserTx } from '../src/db/types.ts';
import { withUser } from '../src/db/with-user.ts';
import { ApiErrorCode } from '../src/enums/api-error-code.ts';
import { checkinOf, getLatestCheckin, postCheckin } from './support/checkin-fixtures.ts';
import {
  PG_INSUFFICIENT_PRIVILEGE,
  newUser,
  type FixtureUser,
  type TestApi,
} from './support/safety-fixtures.ts';
import { startTestApi } from './support/test-api.ts';

const DAY = '2026-11-08';
const NEXT_DAY = '2026-11-09';

describe('Check-ins', () => {
  let api: TestApi;

  beforeAll(async () => {
    api = await startTestApi();
  });
  afterAll(() => api.close());

  const rowsOf = (user: FixtureUser) =>
    api.db.select().from(checkin).where(eq(checkin.userId, user.userId));

  describe('submitting', () => {
    it('stores the Check-in and answers with it', async () => {
      const user = await newUser(api);
      const entry = checkinOf(DAY);

      const { status, result } = await postCheckin(user, entry);

      expect(status).toBe(200);
      expect(result).toEqual({
        status: RecordStatus.Saved,
        recorded: true,
        checkin: { ...entry, submittedAt: expect.any(String) },
      });
      expect(await rowsOf(user)).toHaveLength(1);
    });

    it('accepts every score from the lowest to the highest', async () => {
      const user = await newUser(api);

      for (const score of [MIN_CHECKIN_SCORE, MAX_CHECKIN_SCORE]) {
        const { status } = await postCheckin(
          user,
          checkinOf(DAY, { sleep: score, soreness: score, energy: score }),
        );
        expect(status).toBe(200);
      }
    });

    it('ignores a replay of an id, changing nothing', async () => {
      const user = await newUser(api);
      const entry = checkinOf(DAY);
      const first = await postCheckin(user, entry);

      const replay = await postCheckin(user, { ...entry, sleep: 1, energy: 1, date: NEXT_DAY });

      expect(replay.status).toBe(200);
      expect(replay.result).toEqual({
        status: RecordStatus.Saved,
        recorded: false,
        checkin: first.result.checkin,
      });
      expect(await rowsOf(user)).toHaveLength(1);
    });

    it('accepts a day long past and tomorrow, as a Check-in sent offline arrives late', async () => {
      const user = await newUser(api);

      for (const date of ['2020-01-01', NEXT_DAY]) {
        expect((await postCheckin(user, checkinOf(date))).status).toBe(200);
      }
    });

    it('answers 400 for a body that is not a valid Check-in, and stores nothing', async () => {
      const user = await newUser(api);
      const good = checkinOf(DAY);
      const bad: unknown[] = [
        undefined,
        {},
        { ...good, id: 'x' },
        { ...good, date: '08/11/2026' },
        { ...good, sleep: 0 },
        { ...good, sleep: 6 },
        { ...good, soreness: 2.5 },
        { ...good, energy: '3' },
        { ...good, energy: undefined },
      ];

      for (const body of bad) {
        const response = await user.call(HttpMethod.Post, checkinPath(), body);
        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ error: ApiErrorCode.InvalidRequest });
      }
      expect(await rowsOf(user)).toEqual([]);
    });

    it('answers 401 without a token', async () => {
      const user = await newUser(api);

      const post = await user.call(HttpMethod.Post, checkinPath(), checkinOf(DAY), false);
      const get = await user.call(
        HttpMethod.Get,
        checkinPath(CheckinSubpath.Latest),
        undefined,
        false,
      );

      expect(post.status).toBe(401);
      expect(get.status).toBe(401);
    });
  });

  describe('the latest Check-in', () => {
    it('is null before the first', async () => {
      const user = await newUser(api);

      expect(await getLatestCheckin(user)).toBeNull();
    });

    it('is the one with the latest day, whatever order they arrived in', async () => {
      const user = await newUser(api);
      const later = checkinOf(NEXT_DAY, { sleep: 5 });
      await postCheckin(user, later);
      await postCheckin(user, checkinOf(DAY, { sleep: 1 }));

      expect(await getLatestCheckin(user)).toMatchObject({ id: later.id, date: NEXT_DAY });
    });

    it('is the one sent last when two share a day', async () => {
      const user = await newUser(api);
      await postCheckin(user, checkinOf(DAY, { energy: 1 }));
      const second = checkinOf(DAY, { energy: 5 });
      await postCheckin(user, second);

      expect(await getLatestCheckin(user)).toMatchObject({ id: second.id, energy: 5 });
    });
  });

  describe('privacy', () => {
    it('never shows another user’s Check-in', async () => {
      const user = await newUser(api);
      const stranger = await newUser(api);
      await postCheckin(stranger, checkinOf(NEXT_DAY));

      expect(await getLatestCheckin(user)).toBeNull();
    });

    it('answers 409 and changes nothing when the id is another user’s Check-in', async () => {
      const user = await newUser(api);
      const stranger = await newUser(api);
      const theirs = checkinOf(DAY);
      await postCheckin(stranger, theirs);

      const response = await user.call(HttpMethod.Post, checkinPath(), theirs);

      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: ApiErrorCode.IdTaken });
      expect(await rowsOf(user)).toEqual([]);
    });

    it('lets the app role neither write another user’s rows nor change or delete its own', async () => {
      const user = await newUser(api);
      const stranger = await newUser(api);
      const entry = checkinOf(DAY);
      await postCheckin(user, entry);

      await expect(
        withUser(api.db, stranger.userId, (tx) =>
          tx.insert(checkin).values({ ...checkinOf(DAY), userId: user.userId }),
        ),
      ).rejects.toMatchObject({ cause: { code: PG_INSUFFICIENT_PRIVILEGE } });
      for (const change of [
        (tx: UserTx) => tx.update(checkin).set({ sleep: 1 }).where(eq(checkin.id, entry.id)),
        (tx: UserTx) => tx.delete(checkin).where(eq(checkin.id, entry.id)),
      ]) {
        await expect(withUser(api.db, user.userId, change)).rejects.toMatchObject({
          cause: { code: PG_INSUFFICIENT_PRIVILEGE },
        });
      }
    });

    it('is part of the export oldest first, and goes with the account', async () => {
      const user = await newUser(api);
      const stored = [];
      for (const entry of [checkinOf(NEXT_DAY), checkinOf(DAY)]) {
        stored.push((await postCheckin(user, entry)).result.checkin);
      }

      const exported = userExportSchema.parse(
        await (await user.call(HttpMethod.Get, ApiPath.MeExport)).json(),
      );

      expect(exported.checkins).toEqual(stored);

      expect((await user.call(HttpMethod.Delete, ApiPath.Me)).status).toBe(204);
      expect(await rowsOf(user)).toEqual([]);
    });
  });
});
