import {
  ApiPath,
  DoctorOkRejection,
  HttpMethod,
  RecordStatus,
  recordDoctorOkResultSchema,
  safetyStateSchema,
} from '@stamina/contracts';
import { ReferralKind, ScreeningQuestion, ScreeningStatus, TrainingMode } from '@stamina/domain';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { screening } from '../src/db/schema.ts';
import { withUser } from '../src/db/with-user.ts';
import { ApiErrorCode } from '../src/enums/api-error-code.ts';
import {
  PG_INSUFFICIENT_PRIVILEGE,
  consentToBoth,
  newUser,
  saveProfileFor,
  screeningSubmission,
  type FixtureUser,
  type TestApi,
} from './support/safety-fixtures.ts';
import { startTestApi } from './support/test-api.ts';

/** SQLSTATE 23514: a check constraint failed. */
const PG_CHECK_VIOLATION = '23514';

describe('POST /screening/doctor-ok', () => {
  let api: TestApi;
  beforeAll(async () => {
    api = await startTestApi();
  });
  afterAll(() => api.close());

  const screenedWith = async (...yes: ScreeningQuestion[]) => {
    const user = await newUser(api);
    await saveProfileFor(api, user);
    await consentToBoth(user);
    await user.call(HttpMethod.Post, ApiPath.Screening, screeningSubmission(yes));
    return user;
  };
  const doctorOk = async (user: FixtureUser) => {
    const response = await user.call(HttpMethod.Post, ApiPath.DoctorOk);
    return {
      status: response.status,
      result: recordDoctorOkResultSchema.parse(await response.json()),
    };
  };
  const stateOf = async (user: FixtureUser) =>
    safetyStateSchema.parse(await (await user.call(HttpMethod.Get, ApiPath.Safety)).json())
      .screening;
  const latestRow = async (userId: string) =>
    (await api.db.select().from(screening).where(eq(screening.userId, userId)))[0]!;

  it('answers 401 without a token', async () => {
    const user = await screenedWith(ScreeningQuestion.HeartCondition);

    const response = await user.call(HttpMethod.Post, ApiPath.DoctorOk, undefined, false);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: ApiErrorCode.Unauthorized });
    expect((await latestRow(user.userId)).doctorOkAt).toBeNull();
  });

  describe('for a general referral', () => {
    it.each([ScreeningQuestion.HeartCondition, ScreeningQuestion.SupervisedExercise])(
      'after a yes to %s records the statement and unlocks Limited',
      async (question) => {
        const user = await screenedWith(question);
        expect((await stateOf(user))?.trainingMode).toBe(TrainingMode.Referred);

        const { status, result } = await doctorOk(user);

        expect(status).toBe(200);
        expect(result).toMatchObject({
          status: RecordStatus.Saved,
          screening: {
            referral: ReferralKind.General,
            trainingMode: TrainingMode.Limited,
            doctorOkAt: expect.any(String),
          },
        });
        expect(await stateOf(user)).toEqual(
          result.status === RecordStatus.Saved ? result.screening : undefined,
        );
        expect((await latestRow(user.userId)).doctorOkAt).toBeInstanceOf(Date);
      },
    );

    it('is idempotent: later and concurrent statements keep the first time', async () => {
      const user = await screenedWith(ScreeningQuestion.Breathing);

      const results = await Promise.all([doctorOk(user), doctorOk(user), doctorOk(user)]);
      const later = await doctorOk(user);

      const stamps = [...results, later].map(({ status, result }) => {
        expect(status).toBe(200);
        return result.status === RecordStatus.Saved ? result.screening.doctorOkAt : undefined;
      });
      expect(new Set(stamps).size).toBe(1);
      expect((await latestRow(user.userId)).doctorOkAt?.toISOString()).toBe(stamps[0]);
    });

    it('does not carry over to a retake: a new referral must be stated again', async () => {
      const user = await screenedWith(ScreeningQuestion.ChestPain);
      await doctorOk(user);

      await user.call(
        HttpMethod.Post,
        ApiPath.Screening,
        screeningSubmission([ScreeningQuestion.ChestPain]),
      );

      expect(await stateOf(user)).toMatchObject({
        trainingMode: TrainingMode.Referred,
        doctorOkAt: null,
      });
    });
  });

  describe('is refused with 422', () => {
    it('for pregnancy, which has no Limited path', async () => {
      const user = await screenedWith(ScreeningQuestion.Pregnancy);

      const { status, result } = await doctorOk(user);

      expect(status).toBe(422);
      expect(result).toEqual({
        status: RecordStatus.Rejected,
        reason: DoctorOkRejection.Pregnancy,
      });
      expect(await stateOf(user)).toMatchObject({
        trainingMode: TrainingMode.Referred,
        doctorOkAt: null,
      });
    });

    it('for pregnancy together with another referral question', async () => {
      const user = await screenedWith(ScreeningQuestion.Pregnancy, ScreeningQuestion.Fainting);

      const { status, result } = await doctorOk(user);

      expect(status).toBe(422);
      expect(result).toMatchObject({ reason: DoctorOkRejection.Pregnancy });
    });

    it('for a cleared Screening, which needs nothing', async () => {
      const user = await screenedWith();

      const { status, result } = await doctorOk(user);

      expect(status).toBe(422);
      expect(result).toEqual({
        status: RecordStatus.Rejected,
        reason: DoctorOkRejection.NotReferred,
      });
      expect((await latestRow(user.userId)).doctorOkAt).toBeNull();
    });

    it('when there is no Screening yet', async () => {
      const user = await newUser(api);

      const { status, result } = await doctorOk(user);

      expect(status).toBe(422);
      expect(result).toEqual({
        status: RecordStatus.Rejected,
        reason: DoctorOkRejection.NotReferred,
      });
    });

    it('when the latest Screening is cleared although an earlier one was a referral', async () => {
      const user = await screenedWith(ScreeningQuestion.Fainting);
      await user.call(HttpMethod.Post, ApiPath.Screening, screeningSubmission());

      const { result } = await doctorOk(user);

      expect(result).toMatchObject({ reason: DoctorOkRejection.NotReferred });
    });
  });

  describe('update-once under row-level security', () => {
    it('stamps doctor_ok_at once; a second or clearing update changes nothing or fails', async () => {
      const user = await screenedWith(ScreeningQuestion.HeartCondition);
      const id = (await latestRow(user.userId)).id;
      const stamp = (value: Date | null) =>
        withUser(api.db, user.userId, (tx) =>
          tx.update(screening).set({ doctorOkAt: value }).where(eq(screening.id, id)).returning(),
        );

      await expect(stamp(null)).rejects.toMatchObject({
        cause: { code: PG_INSUFFICIENT_PRIVILEGE },
      });
      const first = await stamp(new Date('2026-03-03T00:00:00Z'));
      const second = await stamp(new Date('2026-04-04T00:00:00Z'));

      expect(first).toHaveLength(1);
      expect(second).toEqual([]);
      expect((await latestRow(user.userId)).doctorOkAt).toEqual(new Date('2026-03-03T00:00:00Z'));
      await expect(stamp(null)).resolves.toEqual([]);
    });

    it('rejects rewriting any other column, and deleting', async () => {
      const user = await screenedWith(ScreeningQuestion.HeartCondition);
      const id = (await latestRow(user.userId)).id;
      const rewrites: Partial<typeof screening.$inferInsert>[] = [
        { status: ScreeningStatus.Cleared },
        { referral: null },
        { nutritionOff: true },
        { answersEncrypted: 'v1.AAAA.AAAA' },
        { takenAt: new Date(0) },
        { userId: crypto.randomUUID() },
      ];

      for (const set of rewrites) {
        await expect(
          withUser(api.db, user.userId, (tx) =>
            tx.update(screening).set(set).where(eq(screening.id, id)),
          ),
        ).rejects.toMatchObject({ cause: { code: PG_INSUFFICIENT_PRIVILEGE } });
      }
      await expect(
        withUser(api.db, user.userId, (tx) => tx.delete(screening).where(eq(screening.id, id))),
      ).rejects.toMatchObject({ cause: { code: PG_INSUFFICIENT_PRIVILEGE } });
      expect(await api.db.select().from(screening).where(eq(screening.id, id))).toHaveLength(1);
    });

    it('cannot see, stamp or insert for another user’s Screening', async () => {
      const owner = await screenedWith(ScreeningQuestion.HeartCondition);
      const stranger = await screenedWith(ScreeningQuestion.HeartCondition);
      const id = (await latestRow(owner.userId)).id;

      const seen = await withUser(api.db, stranger.userId, (tx) =>
        tx.select().from(screening).where(eq(screening.id, id)),
      );
      const stamped = await withUser(api.db, stranger.userId, (tx) =>
        tx
          .update(screening)
          .set({ doctorOkAt: new Date() })
          .where(eq(screening.id, id))
          .returning(),
      );

      expect(seen).toEqual([]);
      expect(stamped).toEqual([]);
      expect((await latestRow(owner.userId)).doctorOkAt).toBeNull();
    });

    it('cannot stamp a pregnancy referral even directly: a check constraint stops it', async () => {
      const user = await screenedWith(ScreeningQuestion.Pregnancy);
      const id = (await latestRow(user.userId)).id;

      await expect(
        withUser(api.db, user.userId, (tx) =>
          tx.update(screening).set({ doctorOkAt: new Date() }).where(eq(screening.id, id)),
        ),
      ).rejects.toMatchObject({ cause: { code: PG_CHECK_VIOLATION } });
    });

    it('cannot stamp a cleared row (referral null) even directly', async () => {
      const user = await screenedWith();
      const row = await latestRow(user.userId);
      expect(row.referral).toBeNull();

      await expect(
        withUser(api.db, user.userId, (tx) =>
          tx.update(screening).set({ doctorOkAt: new Date() }).where(eq(screening.id, row.id)),
        ),
      ).rejects.toMatchObject({ cause: { code: PG_CHECK_VIOLATION } });
    });
  });
});
