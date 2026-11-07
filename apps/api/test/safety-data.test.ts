import {
  ApiPath,
  CheckinSubpath,
  HttpMethod,
  HttpStatus,
  RecordStatus,
  createApiClient,
  saveScreeningResultSchema,
  SportKind,
  NutritionSubpath,
  StopFlagSubpath,
  checkinPath,
  nutritionPath,
  stopFlagPath,
  userExportSchema,
  type ScreeningSubmission,
} from '@stamina/contracts';
import { NO_STOP } from './support/stop-flag-fixtures.ts';
import {
  Allergen,
  BodyArea,
  ConsentPurpose,
  Goal,
  MealLogStatus,
  TEMPLATES,
  ScreeningQuestion,
  SportStatus,
  StartingLevel,
  StopFlag,
  TrainingMode,
} from '@stamina/domain';
import { Locale } from '@stamina/i18n';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createFieldCipher, FieldCipherError } from '../src/crypto/index.ts';
import { appUser, consent, profile, screening, sport } from '../src/db/schema.ts';
import { ApiErrorCode } from '../src/enums/api-error-code.ts';
import type { ErrorReporter } from '../src/error-reporter.ts';
import { checkinOf } from './support/checkin-fixtures.ts';
import { mealLogOf, setupOf, waterOf } from './support/nutrition-fixtures.ts';
import { issueInvite, validSubmission } from './support/profile-fixtures.ts';
import {
  consentToBoth,
  newUser,
  saveProfileFor,
  screeningSubmission,
  type FixtureUser,
  type TestApi,
} from './support/safety-fixtures.ts';
import { expectNoSentinel, SENTINELS } from './support/sentinel.ts';
import { stopFlagOf } from './support/stop-flag-fixtures.ts';
import { startTestApi } from './support/test-api.ts';

const OTHER_KEY = btoa(String.fromCharCode(...Array.from({ length: 32 }, (_, i) => 200 + i)));
const QUESTIONS = Object.values(ScreeningQuestion);
const AREAS = Object.values(BodyArea);

describe('Screening data: encryption, export, deletion, logs', () => {
  let api: TestApi;
  const lines: string[] = [];
  beforeAll(async () => {
    api = await startTestApi({ log: (line) => lines.push(line) });
  });
  afterAll(() => api.close());

  const submit = async (user: FixtureUser, submission: ScreeningSubmission) => {
    const response = await user.call(HttpMethod.Post, ApiPath.Screening, submission);
    expect(response.status).toBe(200);
  };
  const rowsOf = (userId: string) =>
    api.db.select().from(screening).where(eq(screening.userId, userId));
  const consented = async () => {
    const user = await newUser(api);
    await saveProfileFor(api, user);
    await consentToBoth(user);
    return user;
  };
  const answersSubmission = () =>
    screeningSubmission([ScreeningQuestion.Breathing, ScreeningQuestion.BoneJointMuscle], {
      bodyAreas: [BodyArea.Hip, BodyArea.Ankle],
      startingLevel: StartingLevel.Regular,
    });

  describe('encryption at rest', () => {
    it('stores no answer key, value or body area in the column, only a v1 envelope', async () => {
      const user = await consented();

      await submit(user, answersSubmission());

      const [row] = await rowsOf(user.userId);
      const stored = row!.answersEncrypted;
      expect(stored).toMatch(/^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
      for (const token of [...QUESTIONS, ...AREAS, 'true', 'false', 'answers', 'bodyAreas']) {
        expect(stored).not.toContain(token);
      }
    });

    it('decrypts to the submitted answers with the right key and user, and not otherwise', async () => {
      const user = await consented();
      const submission = answersSubmission();
      await submit(user, submission);
      const envelope = (await rowsOf(user.userId))[0]!.answersEncrypted;

      const plain = await api.cipher.decrypt(envelope, user.userId);

      expect(JSON.parse(plain)).toEqual({
        answers: submission.answers,
        bodyAreas: submission.bodyAreas,
      });
      await expect(
        createFieldCipher(OTHER_KEY).decrypt(envelope, user.userId),
      ).rejects.toBeInstanceOf(FieldCipherError);
      await expect(api.cipher.decrypt(envelope, crypto.randomUUID())).rejects.toBeInstanceOf(
        FieldCipherError,
      );
    });

    it('produces a different ciphertext for identical answers', async () => {
      const user = await consented();

      await submit(user, answersSubmission());
      await submit(user, answersSubmission());

      const [a, b] = (await rowsOf(user.userId)).map((row) => row.answersEncrypted);
      expect(a).not.toBe(b);
    });

    it('does not decrypt when an envelope is copied into another user’s row', async () => {
      const owner = await consented();
      const thief = await consented();
      await submit(owner, answersSubmission());
      await submit(thief, screeningSubmission());
      const stolen = (await rowsOf(owner.userId))[0]!.answersEncrypted;
      await api.db
        .update(screening)
        .set({ answersEncrypted: stolen })
        .where(eq(screening.userId, thief.userId));

      const response = await thief.call(HttpMethod.Get, ApiPath.MeExport);

      expect(response.status).toBe(HttpStatus.InternalServerError);
      expect(await response.json()).toEqual({ error: ApiErrorCode.InternalError });
    });
  });

  describe('GET /me/export', () => {
    it('answers 401 without a token', async () => {
      const user = await newUser(api);

      const response = await user.call(HttpMethod.Get, ApiPath.MeExport, undefined, false);

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: ApiErrorCode.Unauthorized });
    });

    it('is empty for a user with nothing', async () => {
      const user = await newUser(api);

      const exported = userExportSchema.parse(
        await (await user.call(HttpMethod.Get, ApiPath.MeExport)).json(),
      );

      expect(exported).toMatchObject({
        profile: null,
        consents: [],
        sportRequests: [],
        screenings: [],
      });
    });

    it('holds the profile, every consent row and every Screening with its decrypted answers', async () => {
      const user = await newUser(api);
      await user.call(
        HttpMethod.Post,
        ApiPath.Profile,
        validSubmission({ inviteCode: await issueInvite(api.db) }),
      );
      await user.call(HttpMethod.Post, ApiPath.Consent, {
        purpose: ConsentPurpose.Disclaimer,
        locale: Locale.El,
      });
      await user.call(HttpMethod.Post, ApiPath.Consent, {
        purpose: ConsentPurpose.HealthData,
        locale: Locale.El,
      });
      const first = answersSubmission();
      const second = screeningSubmission([ScreeningQuestion.EatingDisorder]);
      await submit(user, first);
      await submit(user, second);

      const response = await user.call(HttpMethod.Get, ApiPath.MeExport);
      const exported = userExportSchema.parse(await response.json());

      expect(response.status).toBe(200);
      expect(exported.profile).toMatchObject({ country: 'GR', goal: Goal.SportPerformance });
      expect(exported.consents.map((c) => c.purpose)).toEqual([
        ConsentPurpose.Disclaimer,
        ConsentPurpose.HealthData,
      ]);
      expect(exported.consents[0]).toMatchObject({ locale: Locale.El, withdrawnAt: null });
      expect(exported.screenings).toHaveLength(2);
      expect(exported.screenings[0]).toMatchObject({
        answers: first.answers,
        startingLevel: StartingLevel.Regular,
        excludedAreas: [BodyArea.Hip, BodyArea.Ankle],
      });
      expect(exported.screenings[1]).toMatchObject({
        answers: second.answers,
        nutritionOff: true,
        trainingMode: TrainingMode.Full,
      });
    });

    it('holds the sports the user asked for, even one that was rejected, and nobody else’s', async () => {
      const [asker, other] = [await newUser(api), await newUser(api)];
      for (const [user, name] of [
        [asker, 'Export Roundnet'],
        [other, 'Export Roundnet'],
        [other, 'Export Other Only'],
      ] as const) {
        await user.call(
          HttpMethod.Post,
          ApiPath.Profile,
          validSubmission({
            sport: { kind: SportKind.Other, name },
            inviteCode: await issueInvite(api.db),
          }),
        );
      }
      await api.db
        .update(sport)
        .set({ status: SportStatus.Rejected })
        .where(eq(sport.normalizedName, 'export roundnet'));

      const exported = userExportSchema.parse(
        await (await asker.call(HttpMethod.Get, ApiPath.MeExport)).json(),
      );

      expect(exported.sportRequests).toEqual([
        {
          sportId: expect.any(String),
          name: 'Export Roundnet',
          requestedAt: expect.any(String),
        },
      ]);
    });

    it('holds only the caller’s data', async () => {
      const [a, b] = [await consented(), await consented()];
      await submit(a, answersSubmission());
      await submit(b, screeningSubmission());

      const exported = userExportSchema.parse(
        await (await b.call(HttpMethod.Get, ApiPath.MeExport)).json(),
      );

      expect(exported.screenings).toHaveLength(1);
      expect(exported.screenings[0]?.answers[ScreeningQuestion.Breathing]).toBe(false);
    });

    it('is readable through the typed client', async () => {
      const user = await consented();
      await submit(user, answersSubmission());
      const client = createApiClient({ baseUrl: api.baseUrl, getToken: async () => user.token });

      const exported = await client.exportData();

      expect(exported.screenings[0]?.answers[ScreeningQuestion.Breathing]).toBe(true);
    });
  });

  describe('DELETE /me', () => {
    const rowsAcrossTables = async (userId: string) => ({
      users: await api.db.select().from(appUser).where(eq(appUser.id, userId)),
      profiles: await api.db.select().from(profile).where(eq(profile.userId, userId)),
      consents: await api.db.select().from(consent).where(eq(consent.userId, userId)),
      screenings: await rowsOf(userId),
    });

    it('answers 401 without a token and deletes nothing', async () => {
      const user = await consented();

      const response = await user.call(HttpMethod.Delete, ApiPath.Me, undefined, false);

      expect(response.status).toBe(401);
      expect((await rowsAcrossTables(user.userId)).consents).toHaveLength(2);
    });

    it('removes every row of the user with 204, and no one else’s', async () => {
      const user = await consented();
      const bystander = await consented();
      await user.call(
        HttpMethod.Post,
        ApiPath.Profile,
        validSubmission({ inviteCode: await issueInvite(api.db) }),
      );
      await submit(user, answersSubmission());
      await submit(bystander, answersSubmission());
      const before = await rowsAcrossTables(user.userId);
      expect(
        [before.users, before.profiles, before.consents, before.screenings].map((r) => r.length),
      ).toEqual([1, 1, 2, 1]);

      const response = await user.call(HttpMethod.Delete, ApiPath.Me);

      expect(response.status).toBe(HttpStatus.NoContent);
      expect(await response.text()).toBe('');
      expect(await rowsAcrossTables(user.userId)).toEqual({
        users: [],
        profiles: [],
        consents: [],
        screenings: [],
      });
      expect((await rowsAcrossTables(bystander.userId)).screenings).toHaveLength(1);
      expect((await rowsAcrossTables(bystander.userId)).consents).toHaveLength(2);
    });

    it('is repeatable, and the person starts afresh afterwards', async () => {
      const user = await consented();
      await submit(user, answersSubmission());
      const client = createApiClient({ baseUrl: api.baseUrl, getToken: async () => user.token });

      await client.deleteAccount();
      await client.deleteAccount();

      expect(await client.getSafety()).toEqual({
        profileSaved: false,
        granted: [],
        screening: null,
        stop: NO_STOP,
      });
    });
  });

  describe('logs and error reports', () => {
    it('keep health data out of every request log line', async () => {
      const user = await consented();
      lines.length = 0;

      await user.call(
        HttpMethod.Post,
        `${ApiPath.Screening}?q=${SENTINELS.query}`,
        answersSubmission(),
      );
      await user.call(HttpMethod.Post, ApiPath.Screening, {
        ...answersSubmission(),
        bodyAreas: [SENTINELS.body],
      });
      await user.call(HttpMethod.Post, ApiPath.Consent, { purpose: SENTINELS.body, locale: 'en' });
      await user.call(HttpMethod.Post, ApiPath.DoctorOk);
      await user.call(HttpMethod.Get, ApiPath.Safety);
      await user.call(HttpMethod.Get, ApiPath.MeExport);

      expect(lines).toHaveLength(6);
      expectNoSentinel(lines);
      const text = lines.join('\n');
      for (const token of [...QUESTIONS, ...AREAS, 'v1.']) expect(text).not.toContain(token);
      for (const line of lines) {
        expect(Object.keys(JSON.parse(line) as object).sort()).toEqual(
          expect.arrayContaining(['latency_ms', 'request_id', 'route', 'status']),
        );
        expect(Object.keys(JSON.parse(line) as object).length).toBeLessThanOrEqual(5);
      }
    });

    it('keep Check-in and stop flag data out of every log line and error body', async () => {
      const user = await consented();
      lines.length = 0;
      const bodies: string[] = [];
      const send = async (method: HttpMethod, path: string, body?: unknown) => {
        bodies.push(await (await user.call(method, path, body)).text());
      };

      await send(HttpMethod.Post, `${checkinPath()}?q=${SENTINELS.checkin}`, {
        id: crypto.randomUUID(),
        date: SENTINELS.checkin,
        sleep: SENTINELS.checkin,
        soreness: 3,
        energy: 3,
      });
      await send(HttpMethod.Post, checkinPath(), {
        ...checkinOf('2026-11-08'),
        note: SENTINELS.checkin,
      });
      await send(HttpMethod.Get, `${checkinPath(CheckinSubpath.Latest)}?q=${SENTINELS.checkin}`);
      await send(HttpMethod.Post, `${stopFlagPath()}?q=${SENTINELS.stopFlag}`, {
        id: crypto.randomUUID(),
        flag: SENTINELS.stopFlag,
        date: SENTINELS.stopFlag,
      });
      await send(HttpMethod.Post, stopFlagPath(), {
        ...stopFlagOf(StopFlag.ChestPain, '2026-11-08'),
        note: SENTINELS.stopFlag,
      });
      await send(HttpMethod.Post, `${stopFlagPath()}/${SENTINELS.stopFlag}`);
      await send(HttpMethod.Post, stopFlagPath(StopFlagSubpath.Confirm), {
        flags: [StopFlag.ChestPain],
      });
      await send(HttpMethod.Post, ApiPath.ScreeningRecheck, {
        answers: { [ScreeningQuestion.Fainting]: SENTINELS.stopFlag },
      });
      await send(HttpMethod.Get, ApiPath.Safety);
      await send(HttpMethod.Get, ApiPath.MeExport);

      expect(lines).toHaveLength(10);
      expectNoSentinel(lines);
      expectNoSentinel(bodies);
      const text = lines.join('\n');
      for (const token of [...Object.values(StopFlag), 'soreness']) {
        expect(text).not.toContain(token);
      }
    });

    it('keep weigh-in and Progress data out of every log line and error body', async () => {
      const user = await consented();
      lines.length = 0;
      const bodies: string[] = [];
      const send = async (method: HttpMethod, path: string, body?: unknown) => {
        bodies.push(await (await user.call(method, path, body)).text());
      };

      await send(HttpMethod.Post, `${ApiPath.WeighIns}?q=${SENTINELS.weighIn}`, {
        weightKg: SENTINELS.weighIn,
        date: SENTINELS.weighIn,
      });
      await send(HttpMethod.Post, ApiPath.WeighIns, { weightKg: 72.5, note: SENTINELS.weighIn });
      await send(HttpMethod.Get, `${ApiPath.Progress}?q=${SENTINELS.weighIn}`);
      await send(HttpMethod.Get, ApiPath.MeExport);

      expect(lines).toHaveLength(4);
      expectNoSentinel(lines);
      expectNoSentinel(bodies);
      expect(lines.join('\n')).not.toContain('72.5');
    });

    it('keep Meals setup, targets and water data out of every log line and error body', async () => {
      const user = await consented();
      lines.length = 0;
      const bodies: string[] = [];
      const send = async (method: HttpMethod, path: string, body?: unknown) => {
        bodies.push(await (await user.call(method, path, body)).text());
      };
      const setupPath = nutritionPath(NutritionSubpath.Setup);
      const setup = setupOf({
        heightCm: 171.25,
        weightKg: 63.75,
        allergens: [Allergen.Peanuts],
        dislikes: ['anchovies'],
      });
      const today = new Date().toISOString().slice(0, 10);

      await send(HttpMethod.Put, `${setupPath}?q=${SENTINELS.nutrition}`, {
        ...setup,
        sex: SENTINELS.nutrition,
        heightCm: SENTINELS.nutrition,
        weightKg: SENTINELS.nutrition,
        allergens: [SENTINELS.nutrition],
        dislikes: [SENTINELS.nutrition],
      });
      await send(HttpMethod.Put, setupPath, { ...setup, note: SENTINELS.nutrition });
      await send(HttpMethod.Get, `${ApiPath.Nutrition}?date=${SENTINELS.nutrition}`);
      await send(HttpMethod.Get, `${ApiPath.Nutrition}?date=${today}&q=${SENTINELS.nutrition}`);
      await send(HttpMethod.Post, `${ApiPath.Water}?q=${SENTINELS.nutrition}`, {
        id: SENTINELS.nutrition,
        ml: SENTINELS.nutrition,
        date: SENTINELS.nutrition,
      });
      await send(HttpMethod.Post, ApiPath.Water, { ...waterOf(), note: SENTINELS.nutrition });
      await send(HttpMethod.Post, `${ApiPath.MealLogs}?q=${SENTINELS.nutrition}`, {
        id: SENTINELS.nutrition,
        slotIndex: SENTINELS.nutrition,
        status: SENTINELS.nutrition,
        templateId: SENTINELS.nutrition,
        date: SENTINELS.nutrition,
      });
      await send(HttpMethod.Post, ApiPath.MealLogs, {
        ...mealLogOf({ status: MealLogStatus.Other, templateId: TEMPLATES[0]!.id }),
        note: SENTINELS.nutrition,
      });
      await send(HttpMethod.Get, ApiPath.MeExport);

      expect(lines).toHaveLength(9);
      expectNoSentinel(lines);
      expectNoSentinel(bodies);
      const text = lines.join('\n');
      for (const value of [
        '171.25',
        '63.75',
        Allergen.Peanuts,
        'anchovies',
        MealLogStatus.Other,
        TEMPLATES[0]!.id,
      ]) {
        expect(text).not.toContain(value);
      }
    });

    it('keep plaintext and keys out of an error report when decryption fails', async () => {
      const user = await consented();
      await submit(user, answersSubmission());
      const reported: unknown[] = [];
      const reporter: ErrorReporter = {
        async report(error) {
          reported.push(error);
        },
      };
      const wrongKey = await startTestApi({
        cipher: createFieldCipher(OTHER_KEY),
        errorReporter: reporter,
        log: (line) => lines.push(line),
      });
      lines.length = 0;

      try {
        const response = await fetch(`${wrongKey.baseUrl}${ApiPath.MeExport}`, {
          headers: { authorization: `Bearer ${await wrongKey.signToken(user.userId)}` },
        });
        const body = await response.text();

        expect(response.status).toBe(HttpStatus.InternalServerError);
        expect(JSON.parse(body)).toEqual({ error: ApiErrorCode.InternalError });
        expect(reported).toHaveLength(1);
        expect(reported[0]).toBeInstanceOf(FieldCipherError);
        const leaked = [
          String(reported[0]),
          (reported[0] as Error).stack ?? '',
          body,
          ...lines,
        ].join('\n');
        for (const token of [...QUESTIONS, ...AREAS, OTHER_KEY, 'v1.']) {
          expect(leaked).not.toContain(token);
        }
        expect(JSON.parse(lines[0]!)).toMatchObject({
          error_type: 'FieldCipherError',
          status: 500,
        });
      } finally {
        await wrongKey.close();
      }
    });
  });

  it('records a screening result for the typed client, end to end', async () => {
    const user = await consented();
    const client = createApiClient({ baseUrl: api.baseUrl, getToken: async () => user.token });

    const result = await client.saveScreening(answersSubmission());

    expect(saveScreeningResultSchema.parse(result).status).toBe(RecordStatus.Saved);
    expect((await client.getSafety()).granted).toEqual([
      ConsentPurpose.Disclaimer,
      ConsentPurpose.HealthData,
    ]);
  });
});
