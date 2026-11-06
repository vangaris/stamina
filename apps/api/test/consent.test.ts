import { ApiPath, HttpMethod, consentStateSchema, safetyStateSchema } from '@stamina/contracts';
import { CONSENT_TEXT_VERSIONS, ConsentPurpose } from '@stamina/domain';
import { Locale } from '@stamina/i18n';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NO_STOP } from './support/stop-flag-fixtures.ts';
import { appUser, consent } from '../src/db/schema.ts';
import { withUser } from '../src/db/with-user.ts';
import { ApiErrorCode } from '../src/enums/api-error-code.ts';
import {
  PG_INSUFFICIENT_PRIVILEGE,
  newUser,
  saveProfileFor,
  type FixtureUser,
  type TestApi,
} from './support/safety-fixtures.ts';
import { expectNoSentinel, SENTINELS } from './support/sentinel.ts';
import { startTestApi } from './support/test-api.ts';

describe('/consent and /safety', () => {
  let api: TestApi;
  beforeAll(async () => {
    api = await startTestApi();
  });
  afterAll(() => api.close());

  const grant = (user: FixtureUser, purpose: ConsentPurpose, locale: Locale = Locale.En) =>
    user.call(HttpMethod.Post, ApiPath.Consent, { purpose, locale });
  const safety = async (user: FixtureUser) =>
    safetyStateSchema.parse(await (await user.call(HttpMethod.Get, ApiPath.Safety)).json());
  const rowsOf = (userId: string) =>
    api.db.select().from(consent).where(eq(consent.userId, userId));

  describe('without a token', () => {
    it('answers 401 and stores nothing', async () => {
      const user = await newUser(api);

      const post = await user.call(
        HttpMethod.Post,
        ApiPath.Consent,
        { purpose: ConsentPurpose.Disclaimer, locale: Locale.En },
        false,
      );
      const get = await user.call(HttpMethod.Get, ApiPath.Safety, undefined, false);

      for (const response of [post, get]) {
        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({ error: ApiErrorCode.Unauthorized });
      }
      expect(await rowsOf(user.userId)).toEqual([]);
    });
  });

  describe('GET /safety', () => {
    it('is empty before any consent or Screening', async () => {
      const user = await newUser(api);

      expect(await safety(user)).toEqual({
        profileSaved: false,
        granted: [],
        screening: null,
        stop: NO_STOP,
      });
    });

    it('reports profileSaved once a profile exists', async () => {
      const user = await newUser(api);
      await saveProfileFor(api, user);

      expect(await safety(user)).toEqual({
        profileSaved: true,
        granted: [],
        screening: null,
        stop: NO_STOP,
      });
    });
  });

  describe('POST /consent', () => {
    it('records each purpose with its current text version and the language read', async () => {
      const user = await newUser(api);

      const first = await grant(user, ConsentPurpose.Disclaimer, Locale.El);
      const second = await grant(user, ConsentPurpose.HealthData, Locale.En);

      expect(first.status).toBe(200);
      expect(consentStateSchema.parse(await first.json())).toEqual({
        granted: [ConsentPurpose.Disclaimer],
      });
      expect(consentStateSchema.parse(await second.json())).toEqual({
        granted: [ConsentPurpose.Disclaimer, ConsentPurpose.HealthData],
      });
      const rows = await rowsOf(user.userId);
      expect(rows).toHaveLength(2);
      expect(rows.find((r) => r.purpose === ConsentPurpose.Disclaimer)).toMatchObject({
        textVersion: CONSENT_TEXT_VERSIONS[ConsentPurpose.Disclaimer],
        locale: Locale.El,
        withdrawnAt: null,
      });
      expect(rows.find((r) => r.purpose === ConsentPurpose.HealthData)).toMatchObject({
        textVersion: CONSENT_TEXT_VERSIONS[ConsentPurpose.HealthData],
        locale: Locale.En,
      });
      expect((await safety(user)).granted).toEqual([
        ConsentPurpose.Disclaimer,
        ConsentPurpose.HealthData,
      ]);
    });

    it('is idempotent: a repeated or concurrent grant adds no row', async () => {
      const user = await newUser(api);

      await grant(user, ConsentPurpose.HealthData);
      const again = await Promise.all(
        Array.from({ length: 5 }, () => grant(user, ConsentPurpose.HealthData, Locale.El)),
      );

      expect(again.map((r) => r.status)).toEqual([200, 200, 200, 200, 200]);
      const rows = await rowsOf(user.userId);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ locale: Locale.En });
    });

    it('does not count a grant of an older text version, and a new grant adds a row', async () => {
      const user = await newUser(api);
      await user.call(HttpMethod.Get, ApiPath.Me);
      await api.db.insert(consent).values({
        userId: user.userId,
        purpose: ConsentPurpose.Disclaimer,
        textVersion: 'disclaimer-v0',
        locale: Locale.En,
      });
      expect((await safety(user)).granted).toEqual([]);

      const response = await grant(user, ConsentPurpose.Disclaimer);

      expect(consentStateSchema.parse(await response.json()).granted).toEqual([
        ConsentPurpose.Disclaimer,
      ]);
      expect(await rowsOf(user.userId)).toHaveLength(2);
    });

    it('answers 400 without echoing a malformed body', async () => {
      const user = await newUser(api);
      const bodies = [
        { purpose: SENTINELS.body, locale: Locale.En },
        { purpose: ConsentPurpose.Disclaimer, locale: SENTINELS.body },
        { purpose: ConsentPurpose.Disclaimer },
        { locale: Locale.En },
        [],
        null,
        'text',
      ];

      for (const body of bodies) {
        const response = await user.call(HttpMethod.Post, ApiPath.Consent, body);
        const text = await response.text();

        expect(response.status).toBe(400);
        expect(JSON.parse(text)).toEqual({ error: ApiErrorCode.InvalidRequest });
        expectNoSentinel(text);
      }
      const notJson = await fetch(`${api.baseUrl}${ApiPath.Consent}`, {
        method: HttpMethod.Post,
        headers: { authorization: `Bearer ${user.token}` },
        body: '{not json',
      });
      expect(notJson.status).toBe(400);
      expect(await rowsOf(user.userId)).toEqual([]);
    });
  });

  describe('append-only rows and row-level security', () => {
    let owner: FixtureUser;
    let stranger: FixtureUser;
    let rowId: string;
    beforeAll(async () => {
      owner = await newUser(api);
      stranger = await newUser(api);
      await grant(owner, ConsentPurpose.Disclaimer);
      await grant(stranger, ConsentPurpose.Disclaimer);
      rowId = (await rowsOf(owner.userId))[0]!.id;
    });

    it('lets the user read only their own rows', async () => {
      const asOwner = await withUser(api.db, owner.userId, (tx) => tx.select().from(consent));
      const ownRowAsStranger = await withUser(api.db, stranger.userId, (tx) =>
        tx.select().from(consent).where(eq(consent.id, rowId)),
      );

      expect(asOwner.map((r) => r.userId)).toEqual([owner.userId]);
      expect(ownRowAsStranger).toEqual([]);
    });

    it('rejects inserting a row for another user', async () => {
      await expect(
        withUser(api.db, stranger.userId, (tx) =>
          tx.insert(consent).values({
            userId: owner.userId,
            purpose: ConsentPurpose.HealthData,
            textVersion: CONSENT_TEXT_VERSIONS[ConsentPurpose.HealthData],
            locale: Locale.En,
          }),
        ),
      ).rejects.toMatchObject({ cause: { code: PG_INSUFFICIENT_PRIVILEGE } });
    });

    it('rejects rewriting any column but withdrawn_at, and deleting', async () => {
      const rewrites = [
        { purpose: ConsentPurpose.HealthData },
        { textVersion: 'disclaimer-v9' },
        { locale: Locale.El },
        { grantedAt: new Date(0) },
        { userId: stranger.userId },
      ];

      for (const set of rewrites) {
        await expect(
          withUser(api.db, owner.userId, (tx) =>
            tx.update(consent).set(set).where(eq(consent.id, rowId)),
          ),
        ).rejects.toMatchObject({ cause: { code: PG_INSUFFICIENT_PRIVILEGE } });
      }
      await expect(
        withUser(api.db, owner.userId, (tx) => tx.delete(consent).where(eq(consent.id, rowId))),
      ).rejects.toMatchObject({ cause: { code: PG_INSUFFICIENT_PRIVILEGE } });
      expect(await rowsOf(owner.userId)).toHaveLength(1);
    });

    it('cannot withdraw another user’s consent', async () => {
      const updated = await withUser(api.db, stranger.userId, (tx) =>
        tx
          .update(consent)
          .set({ withdrawnAt: new Date() })
          .where(eq(consent.id, rowId))
          .returning(),
      );

      expect(updated).toEqual([]);
      expect((await rowsOf(owner.userId))[0]!.withdrawnAt).toBeNull();
    });

    it('sets withdrawn_at once, never clears or changes it, and a later grant is a new row', async () => {
      const user = await newUser(api);
      await grant(user, ConsentPurpose.HealthData);
      const id = (await rowsOf(user.userId))[0]!.id;
      const withdraw = (value: Date | null) =>
        withUser(api.db, user.userId, (tx) =>
          tx.update(consent).set({ withdrawnAt: value }).where(eq(consent.id, id)).returning(),
        );

      await expect(withdraw(null)).rejects.toMatchObject({
        cause: { code: PG_INSUFFICIENT_PRIVILEGE },
      });
      const first = await withdraw(new Date('2026-01-01T00:00:00Z'));
      const second = await withdraw(new Date('2026-02-02T00:00:00Z'));

      expect(first).toHaveLength(1);
      expect(second).toEqual([]);
      expect((await rowsOf(user.userId))[0]!.withdrawnAt).toEqual(new Date('2026-01-01T00:00:00Z'));
      expect((await safety(user)).granted).toEqual([]);
      await grant(user, ConsentPurpose.HealthData);
      expect(await rowsOf(user.userId)).toHaveLength(2);
      expect((await safety(user)).granted).toEqual([ConsentPurpose.HealthData]);
    });

    it('is cleaned up with the user: the row goes when app_user does', async () => {
      const user = await newUser(api);
      await grant(user, ConsentPurpose.Disclaimer);

      await api.db.delete(appUser).where(eq(appUser.id, user.userId));

      expect(
        await api.db
          .select()
          .from(consent)
          .where(and(eq(consent.userId, user.userId))),
      ).toEqual([]);
    });
  });
});
