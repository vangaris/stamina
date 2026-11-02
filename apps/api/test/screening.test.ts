import {
  ApiPath,
  HttpMethod,
  ProfileRejection,
  RecordStatus,
  SaveProfileStatus,
  ScreeningRejection,
  getProfileResponseSchema,
  saveProfileResultSchema,
  saveScreeningResultSchema,
  safetyStateSchema,
  type SavedScreening,
  type ScreeningSubmission,
} from '@stamina/contracts';
import {
  BodyArea,
  Goal,
  ConsentPurpose,
  REFERRAL_QUESTIONS,
  ReferralKind,
  ScreeningQuestion,
  ScreeningStatus,
  StartingLevel,
  TrainingMode,
} from '@stamina/domain';
import { Locale } from '@stamina/i18n';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { screening } from '../src/db/schema.ts';
import { ApiErrorCode } from '../src/enums/api-error-code.ts';
import { issueInvite, omit, validSubmission } from './support/profile-fixtures.ts';
import {
  consentToBoth,
  newUser,
  saveProfileFor,
  screeningSubmission,
  type FixtureUser,
  type TestApi,
} from './support/safety-fixtures.ts';
import { expectNoSentinel, SENTINELS } from './support/sentinel.ts';
import { startTestApi } from './support/test-api.ts';

describe('POST /screening', () => {
  let api: TestApi;
  beforeAll(async () => {
    api = await startTestApi();
  });
  afterAll(() => api.close());

  const submit = (user: FixtureUser, body: unknown) =>
    user.call(HttpMethod.Post, ApiPath.Screening, body);
  /** Submits and returns the saved Screening (and whether the Goal changed); fails on anything else. */
  const take = async (user: FixtureUser, submission: ScreeningSubmission) => {
    const response = await submit(user, submission);
    expect(response.status).toBe(200);
    const result = saveScreeningResultSchema.parse(await response.json());
    if (result.status !== RecordStatus.Saved) throw new Error('screening was rejected');
    return result;
  };
  const consented = async (goal?: Goal) => {
    const user = await newUser(api);
    await saveProfileFor(api, user, goal);
    await consentToBoth(user);
    return user;
  };
  const rowsOf = (userId: string) =>
    api.db.select().from(screening).where(eq(screening.userId, userId));
  const latest = async (user: FixtureUser) =>
    safetyStateSchema.parse(await (await user.call(HttpMethod.Get, ApiPath.Safety)).json())
      .screening;
  const goalOf = async (user: FixtureUser) =>
    getProfileResponseSchema.parse(await (await user.call(HttpMethod.Get, ApiPath.Profile)).json())
      .profile?.goal;
  const saveProfile = async (user: FixtureUser, goal: Goal, code?: string) =>
    user.call(
      HttpMethod.Post,
      ApiPath.Profile,
      validSubmission({ goal, inviteCode: code ?? (await issueInvite(api.db)) }),
    );

  it('answers 401 without a token and stores nothing', async () => {
    const user = await consented();

    const response = await user.call(
      HttpMethod.Post,
      ApiPath.Screening,
      screeningSubmission(),
      false,
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: ApiErrorCode.Unauthorized });
    expect(await rowsOf(user.userId)).toEqual([]);
  });

  describe('needs both consents first', () => {
    it.each([
      ['neither', []],
      ['only the disclaimer', [ConsentPurpose.Disclaimer]],
      ['only the health-data consent', [ConsentPurpose.HealthData]],
    ])('is rejected with %s, and stores nothing', async (_label, purposes) => {
      const user = await newUser(api);
      await saveProfileFor(api, user);
      for (const purpose of purposes) {
        await user.call(HttpMethod.Post, ApiPath.Consent, { purpose, locale: Locale.En });
      }

      const response = await submit(user, screeningSubmission([ScreeningQuestion.HeartCondition]));

      expect(response.status).toBe(422);
      expect(await response.json()).toEqual({
        status: RecordStatus.Rejected,
        reason: ScreeningRejection.ConsentMissing,
      });
      expect(await rowsOf(user.userId)).toEqual([]);
    });
  });

  describe('outcomes', () => {
    it('all no is Cleared with full training', async () => {
      const user = await consented();

      const result = await take(user, screeningSubmission());

      expect(result).toEqual({
        status: RecordStatus.Saved,
        goalChanged: false,
        screening: {
          status: ScreeningStatus.Cleared,
          referral: null,
          nutritionOff: false,
          excludedAreas: [],
          startingLevel: StartingLevel.Beginner,
          trainingMode: TrainingMode.Full,
          takenAt: expect.any(String),
          doctorOkAt: null,
        },
      });
      expect(await latest(user)).toEqual(result.screening);
    });

    it('records the starting level', async () => {
      const user = await consented();

      const result = await take(
        user,
        screeningSubmission([], { startingLevel: StartingLevel.Regular }),
      );

      expect(result.screening.startingLevel).toBe(StartingLevel.Regular);
    });

    const referralWithoutPregnancy = REFERRAL_QUESTIONS.filter(
      (question) => question !== ScreeningQuestion.Pregnancy,
    );
    it.each(referralWithoutPregnancy)(
      'a yes to %s is Referred with the general wording and no training',
      async (question) => {
        const user = await consented();

        const { screening: saved, goalChanged } = await take(user, screeningSubmission([question]));

        expect(saved).toMatchObject({
          status: ScreeningStatus.Referred,
          referral: ReferralKind.General,
          nutritionOff: false,
          excludedAreas: [],
          trainingMode: TrainingMode.Referred,
          doctorOkAt: null,
        });
        expect(goalChanged).toBe(false);
      },
    );

    it('a yes to pregnancy is Referred with the pregnancy wording and no training', async () => {
      const user = await consented();

      const { screening: saved } = await take(
        user,
        screeningSubmission([ScreeningQuestion.Pregnancy]),
      );

      expect(saved).toMatchObject({
        status: ScreeningStatus.Referred,
        referral: ReferralKind.Pregnancy,
        trainingMode: TrainingMode.Referred,
      });
    });

    it('pregnancy wording wins when other referral questions are yes too', async () => {
      const user = await consented();

      const { screening: saved } = await take(
        user,
        screeningSubmission([ScreeningQuestion.HeartCondition, ScreeningQuestion.Pregnancy]),
      );

      expect(saved.referral).toBe(ReferralKind.Pregnancy);
    });

    it('a yes to the eating-disorder question turns Nutrition off but stays Cleared', async () => {
      const user = await consented();

      const { screening: saved, goalChanged } = await take(
        user,
        screeningSubmission([ScreeningQuestion.EatingDisorder]),
      );

      expect(saved).toMatchObject({
        status: ScreeningStatus.Cleared,
        referral: null,
        nutritionOff: true,
        trainingMode: TrainingMode.Full,
      });
      expect(goalChanged).toBe(false);
    });

    it('a yes to the bone, joint or muscle question excludes the areas (once each) and stays Cleared', async () => {
      const user = await consented();

      const { screening: saved } = await take(
        user,
        screeningSubmission([ScreeningQuestion.BoneJointMuscle], {
          bodyAreas: [BodyArea.Knee, BodyArea.LowerBack, BodyArea.Knee],
        }),
      );

      expect(saved).toMatchObject({
        status: ScreeningStatus.Cleared,
        nutritionOff: false,
        excludedAreas: [BodyArea.Knee, BodyArea.LowerBack],
        trainingMode: TrainingMode.Full,
      });
    });

    it('combines: a referral, Nutrition off and excluded areas together', async () => {
      const user = await consented();

      const { screening: saved } = await take(
        user,
        screeningSubmission(
          [
            ScreeningQuestion.Breathing,
            ScreeningQuestion.EatingDisorder,
            ScreeningQuestion.BoneJointMuscle,
          ],
          { bodyAreas: [BodyArea.Shoulder] },
        ),
      );

      expect(saved).toMatchObject({
        status: ScreeningStatus.Referred,
        referral: ReferralKind.General,
        nutritionOff: true,
        excludedAreas: [BodyArea.Shoulder],
        trainingMode: TrainingMode.Referred,
      });
    });
  });

  describe('history', () => {
    it('keeps every Screening and the latest wins, both ways', async () => {
      const user = await consented();

      await take(user, screeningSubmission([ScreeningQuestion.ChestPain]));
      expect((await latest(user))?.status).toBe(ScreeningStatus.Referred);
      await take(user, screeningSubmission());
      expect((await latest(user))?.status).toBe(ScreeningStatus.Cleared);
      await take(user, screeningSubmission([ScreeningQuestion.Fainting]));

      expect((await latest(user))?.status).toBe(ScreeningStatus.Referred);
      expect(await rowsOf(user.userId)).toHaveLength(3);
    });
  });

  describe('the body-composition Goal', () => {
    it('is switched to General fitness when Nutrition goes off, and saveProfile then refuses it', async () => {
      const user = await consented(Goal.BodyComposition);

      const { goalChanged } = await take(
        user,
        screeningSubmission([ScreeningQuestion.EatingDisorder]),
      );

      expect(goalChanged).toBe(true);
      expect(await goalOf(user)).toBe(Goal.GeneralFitness);

      const refused = await saveProfile(user, Goal.BodyComposition);
      expect(refused.status).toBe(422);
      expect(saveProfileResultSchema.parse(await refused.json())).toEqual({
        status: SaveProfileStatus.Rejected,
        reason: ProfileRejection.GoalUnavailable,
      });
      expect(await goalOf(user)).toBe(Goal.GeneralFitness);

      const allowed = await saveProfile(user, Goal.Strength);
      expect(allowed.status).toBe(200);
      expect(await goalOf(user)).toBe(Goal.Strength);
    });

    it('leaves other Goals alone', async () => {
      const user = await consented(Goal.Strength);

      const { goalChanged } = await take(
        user,
        screeningSubmission([ScreeningQuestion.EatingDisorder]),
      );

      expect(goalChanged).toBe(false);
      expect(await goalOf(user)).toBe(Goal.Strength);
    });

    it('is not touched without Nutrition off', async () => {
      const user = await consented(Goal.BodyComposition);

      const { goalChanged } = await take(user, screeningSubmission([ScreeningQuestion.HeadInjury]));

      expect(goalChanged).toBe(false);
      expect(await goalOf(user)).toBe(Goal.BodyComposition);
    });

    it('is rejected with profile-missing before consent, and stores nothing', async () => {
      const user = await newUser(api);

      const response = await submit(user, screeningSubmission([ScreeningQuestion.EatingDisorder]));

      expect(response.status).toBe(422);
      expect(await response.json()).toEqual({
        status: RecordStatus.Rejected,
        reason: ScreeningRejection.ProfileMissing,
      });
      expect(await rowsOf(user.userId)).toEqual([]);
    });

    it('is rejected with profile-missing even with both consents', async () => {
      const user = await newUser(api);
      await consentToBoth(user);

      const response = await submit(user, screeningSubmission());

      expect(response.status).toBe(422);
      expect(await response.json()).toEqual({
        status: RecordStatus.Rejected,
        reason: ScreeningRejection.ProfileMissing,
      });
      expect(await rowsOf(user.userId)).toEqual([]);
    });

    it('is available again once a later Screening has Nutrition on', async () => {
      const user = await consented();
      await take(user, screeningSubmission([ScreeningQuestion.EatingDisorder]));
      await take(user, screeningSubmission());

      const response = await saveProfile(user, Goal.BodyComposition);

      expect(response.status).toBe(200);
    });
  });

  describe('invalid bodies', () => {
    const base = () => screeningSubmission([ScreeningQuestion.BoneJointMuscle]);
    const without = (question: ScreeningQuestion) => {
      const { answers, ...rest } = base();
      return {
        ...rest,
        answers: Object.fromEntries(Object.entries(answers).filter(([key]) => key !== question)),
      };
    };

    it.each([
      ['no body', undefined],
      ['not an object', 'yes'],
      ['a missing answer', without(ScreeningQuestion.Pregnancy)],
      [
        'an unknown question',
        { ...base(), answers: { ...base().answers, [SENTINELS.body]: true } },
      ],
      ['a non-boolean answer', { ...base(), answers: { ...base().answers, pregnancy: 'yes' } }],
      ['a missing answers object', { bodyAreas: [], startingLevel: StartingLevel.Beginner }],
      ['a missing starting level', omit(base(), 'startingLevel')],
      ['an unknown starting level', { ...base(), startingLevel: SENTINELS.body }],
      ['an unknown body area', { ...base(), bodyAreas: [SENTINELS.body] }],
      ['missing body areas', omit(base(), 'bodyAreas')],
      ['Q6 yes without areas', { ...base(), bodyAreas: [] }],
      ['areas without Q6 yes', { ...screeningSubmission(), bodyAreas: [BodyArea.Knee] }],
    ])('answers 400 for %s, without echoing it, and stores nothing', async (_label, body) => {
      const user = await consented();

      const response = await submit(user, body);
      const text = await response.text();

      expect(response.status).toBe(400);
      expect(JSON.parse(text)).toEqual({ error: ApiErrorCode.InvalidRequest });
      expectNoSentinel(text);
      expect(await rowsOf(user.userId)).toEqual([]);
    });

    it('answers 400 for a body that is not JSON', async () => {
      const user = await consented();

      const response = await fetch(`${api.baseUrl}${ApiPath.Screening}`, {
        method: HttpMethod.Post,
        headers: { authorization: `Bearer ${user.token}` },
        body: '{not json',
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: ApiErrorCode.InvalidRequest });
    });

    it('checks the body before consent: a bad body from a user without consent is 400', async () => {
      const user = await newUser(api);

      const response = await submit(user, { answers: {} });

      expect(response.status).toBe(400);
    });
  });

  it('never returns the answers', async () => {
    const user = await consented();

    const response = await submit(
      user,
      screeningSubmission([ScreeningQuestion.HeartCondition, ScreeningQuestion.BoneJointMuscle]),
    );
    const text = await response.text();

    for (const question of Object.values(ScreeningQuestion)) {
      expect(text).not.toContain(question);
    }
    expect(Object.keys(JSON.parse(text).screening as SavedScreening).sort()).toEqual([
      'doctorOkAt',
      'excludedAreas',
      'nutritionOff',
      'referral',
      'startingLevel',
      'status',
      'takenAt',
      'trainingMode',
    ]);
  });
});
