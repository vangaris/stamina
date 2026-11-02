import {
  DoctorOkRejection,
  ProfileRejection,
  RecordStatus,
  SaveProfileStatus,
  ScreeningRejection,
  SportKind,
  type ProfileAnswers,
  type ScreeningSubmission,
} from '@stamina/contracts';
import {
  BodyArea,
  ConsentPurpose,
  Goal,
  Intensity,
  LaunchSport,
  Need,
  ReferralKind,
  ScreeningQuestion,
  ScreeningStatus,
  StartingLevel,
  TrainingMode,
  Units,
  Weekday,
} from '@stamina/domain';
import { Locale } from '@stamina/i18n';
import { describe, expect, it } from 'vitest';
import { FAKE_AUTH } from '../config.ts';
import {
  AppErrorCode,
  checkInvite,
  deleteAccount,
  exportData,
  FAKE_INVITE,
  getSafety,
  grantConsent,
  recordDoctorOk,
  saveProfile,
  saveScreening,
  SafetyStatus,
  signOut,
  verifyEmailCode,
} from '../index.ts';
import { setupMediator } from '../testing/setup-mediator.ts';

const EMAIL = 'ada@example.com';

function profileAnswers(goal: Goal): ProfileAnswers {
  return {
    needs: Need.Both,
    birthYear: 1990,
    country: 'GR',
    sport: { kind: SportKind.Launch, sport: LaunchSport.Padel },
    playDays: [Weekday.Tue],
    playVaries: false,
    playMinutes: 90,
    playIntensity: Intensity.Moderate,
    goal,
    trainingWeek: {
      sessionsPerWeek: 3,
      sessionMinutes: 45,
      availableDays: [Weekday.Mon, Weekday.Wed, Weekday.Fri],
    },
    locale: Locale.En,
    units: Units.Metric,
  };
}

/** All ten answers no, with the given ones yes. */
function submission(
  yes: ScreeningQuestion[] = [],
  bodyAreas: BodyArea[] = [],
  startingLevel = StartingLevel.Beginner,
): ScreeningSubmission {
  return {
    answers: Object.fromEntries(
      Object.values(ScreeningQuestion).map((question) => [question, yes.includes(question)]),
    ) as Record<ScreeningQuestion, boolean>,
    bodyAreas,
    startingLevel,
  };
}

async function signedIn() {
  const setup = setupMediator();
  await setup.mediator.send(verifyEmailCode(EMAIL, FAKE_AUTH.validCode));
  return setup;
}

/** Signed in with a saved profile: onboarding done, no consent given yet. */
async function onboarded(goal = Goal.Strength) {
  const setup = await signedIn();
  await setup.mediator.send(checkInvite(FAKE_INVITE.validCode));
  await setup.mediator.send(saveProfile(profileAnswers(goal)));
  return setup;
}

/** Onboarded with both consents given: ready for the Screening page. */
async function consented(goal = Goal.Strength) {
  const setup = await onboarded(goal);
  for (const purpose of Object.values(ConsentPurpose)) {
    await setup.mediator.send(grantConsent({ purpose, locale: Locale.En }));
  }
  return setup;
}

describe('getSafety through the mediator', () => {
  it('sends a person without a saved profile to onboarding first, even with consents given', async () => {
    const { mediator } = await signedIn();
    expect(await mediator.send(getSafety())).toEqual({ status: SafetyStatus.ProfileNeeded });

    for (const purpose of Object.values(ConsentPurpose)) {
      await mediator.send(grantConsent({ purpose, locale: Locale.En }));
    }

    expect(await mediator.send(getSafety())).toEqual({ status: SafetyStatus.ProfileNeeded });
  });

  it('asks for both consents of an onboarded person, in the order the screen shows them', async () => {
    const { mediator } = await onboarded();

    expect(await mediator.send(getSafety())).toEqual({
      status: SafetyStatus.ConsentNeeded,
      missing: [ConsentPurpose.Disclaimer, ConsentPurpose.HealthData],
    });
  });

  it('asks only for the consent that is still missing', async () => {
    const { mediator } = await onboarded();
    await mediator.send(grantConsent({ purpose: ConsentPurpose.Disclaimer, locale: Locale.El }));

    expect(await mediator.send(getSafety())).toEqual({
      status: SafetyStatus.ConsentNeeded,
      missing: [ConsentPurpose.HealthData],
    });
  });

  it('asks for the Screening once both consents are given, and a repeated grant adds nothing', async () => {
    const { mediator } = await consented();
    await mediator.send(grantConsent({ purpose: ConsentPurpose.Disclaimer, locale: Locale.En }));

    expect(await mediator.send(getSafety())).toEqual({ status: SafetyStatus.ScreeningNeeded });
    const { consents } = await mediator.send(exportData());
    expect(consents).toHaveLength(2);
  });

  it('is Ready after an all-no Screening, in Full mode', async () => {
    const { mediator } = await consented();
    await mediator.send(saveScreening(submission()));

    expect(await mediator.send(getSafety())).toMatchObject({
      status: SafetyStatus.Ready,
      screening: { status: ScreeningStatus.Cleared, trainingMode: TrainingMode.Full },
    });
  });

  it('says Referred after a referral, and Ready (Limited) once the doctor statement is recorded', async () => {
    const { mediator } = await consented();
    await mediator.send(saveScreening(submission([ScreeningQuestion.HeartCondition])));
    expect(await mediator.send(getSafety())).toMatchObject({
      status: SafetyStatus.Referred,
      screening: { trainingMode: TrainingMode.Referred },
    });

    await mediator.send(recordDoctorOk());

    expect(await mediator.send(getSafety())).toMatchObject({
      status: SafetyStatus.Ready,
      screening: { trainingMode: TrainingMode.Limited },
    });
  });

  it('fails with Unauthorized when signed out', async () => {
    const { mediator } = setupMediator();

    await expect(mediator.send(getSafety())).rejects.toMatchObject({
      code: AppErrorCode.Unauthorized,
    });
  });
});

describe('saveScreening through the mediator', () => {
  it('is rejected, and nothing is stored, while a consent is missing', async () => {
    const { mediator } = await onboarded();
    await mediator.send(grantConsent({ purpose: ConsentPurpose.Disclaimer, locale: Locale.En }));

    const result = await mediator.send(saveScreening(submission()));

    expect(result).toEqual({
      status: RecordStatus.Rejected,
      reason: ScreeningRejection.ConsentMissing,
    });
    expect((await mediator.send(exportData())).screenings).toEqual([]);
  });

  it('is rejected, and nothing is stored, without a saved profile, before consent is checked', async () => {
    const { mediator } = await signedIn();

    const withoutConsent = await mediator.send(saveScreening(submission()));
    for (const purpose of Object.values(ConsentPurpose)) {
      await mediator.send(grantConsent({ purpose, locale: Locale.En }));
    }
    const withConsent = await mediator.send(saveScreening(submission()));

    const expected = { status: RecordStatus.Rejected, reason: ScreeningRejection.ProfileMissing };
    expect(withoutConsent).toEqual(expected);
    expect(withConsent).toEqual(expected);
    expect((await mediator.send(exportData())).screenings).toEqual([]);
  });

  it('clears all no, with the starting level recorded', async () => {
    const { mediator } = await consented();

    const result = await mediator.send(saveScreening(submission([], [], StartingLevel.Regular)));

    expect(result).toMatchObject({
      status: RecordStatus.Saved,
      goalChanged: false,
      screening: {
        status: ScreeningStatus.Cleared,
        referral: null,
        nutritionOff: false,
        excludedAreas: [],
        startingLevel: StartingLevel.Regular,
        trainingMode: TrainingMode.Full,
        doctorOkAt: null,
      },
    });
  });

  it.each([
    ScreeningQuestion.HeartCondition,
    ScreeningQuestion.ChestPain,
    ScreeningQuestion.Fainting,
    ScreeningQuestion.DiabetesOrKidney,
    ScreeningQuestion.Breathing,
    ScreeningQuestion.HeadInjury,
    ScreeningQuestion.SupervisedExercise,
  ])('refers a yes to %s with the general wording', async (question) => {
    const { mediator } = await consented();

    const result = await mediator.send(saveScreening(submission([question])));

    expect(result).toMatchObject({
      status: RecordStatus.Saved,
      screening: {
        status: ScreeningStatus.Referred,
        referral: ReferralKind.General,
        trainingMode: TrainingMode.Referred,
      },
    });
  });

  it('refers a yes to pregnancy with the pregnancy wording', async () => {
    const { mediator } = await consented();

    const result = await mediator.send(saveScreening(submission([ScreeningQuestion.Pregnancy])));

    expect(result).toMatchObject({
      screening: { status: ScreeningStatus.Referred, referral: ReferralKind.Pregnancy },
    });
  });

  it('turns Nutrition off for eating-disorder treatment and keeps training open', async () => {
    const { mediator } = await consented();

    const result = await mediator.send(
      saveScreening(submission([ScreeningQuestion.EatingDisorder])),
    );

    expect(result).toMatchObject({
      screening: {
        status: ScreeningStatus.Cleared,
        nutritionOff: true,
        trainingMode: TrainingMode.Full,
      },
    });
  });

  it('excludes the picked body areas and keeps training open', async () => {
    const { mediator } = await consented();

    const result = await mediator.send(
      saveScreening(
        submission([ScreeningQuestion.BoneJointMuscle], [BodyArea.Knee, BodyArea.LowerBack]),
      ),
    );

    expect(result).toMatchObject({
      screening: {
        status: ScreeningStatus.Cleared,
        excludedAreas: [BodyArea.Knee, BodyArea.LowerBack],
        trainingMode: TrainingMode.Full,
      },
    });
  });

  it('switches a body-composition Goal to General fitness when Nutrition turns off', async () => {
    const { mediator } = await consented(Goal.BodyComposition);

    const result = await mediator.send(
      saveScreening(submission([ScreeningQuestion.EatingDisorder])),
    );

    expect(result).toMatchObject({ status: RecordStatus.Saved, goalChanged: true });
    expect((await mediator.send(exportData())).profile).toMatchObject({
      goal: Goal.GeneralFitness,
    });
  });

  it('leaves another Goal alone when Nutrition turns off', async () => {
    const { mediator } = await consented(Goal.Strength);

    const result = await mediator.send(
      saveScreening(submission([ScreeningQuestion.EatingDisorder])),
    );

    expect(result).toMatchObject({ goalChanged: false });
    expect((await mediator.send(exportData())).profile).toMatchObject({ goal: Goal.Strength });
  });

  it('refuses the body-composition Goal in the profile while Nutrition is off', async () => {
    const { mediator, services } = await consented(Goal.Strength);
    await mediator.send(saveScreening(submission([ScreeningQuestion.EatingDisorder])));

    // The mediator sends the remembered invite with every profile save, the first one used it up.
    services.inviteStorage.save(FAKE_INVITE.validCode);
    const result = await mediator.send(saveProfile(profileAnswers(Goal.BodyComposition)));

    expect(result).toEqual({
      status: SaveProfileStatus.Rejected,
      reason: ProfileRejection.GoalUnavailable,
    });
    expect((await mediator.send(exportData())).profile).toMatchObject({ goal: Goal.Strength });
  });

  it('keeps every Screening and the latest one wins', async () => {
    const { mediator } = await consented();
    await mediator.send(saveScreening(submission([ScreeningQuestion.Fainting])));
    await mediator.send(saveScreening(submission()));

    expect(await mediator.send(getSafety())).toMatchObject({ status: SafetyStatus.Ready });
    expect((await mediator.send(exportData())).screenings).toHaveLength(2);
  });

  it.each([
    ['a missing answer', { ...submission(), answers: { [ScreeningQuestion.Fainting]: false } }],
    ['areas without the bone, joint or muscle question', submission([], [BodyArea.Knee])],
    [
      'the bone, joint or muscle question without an area',
      submission([ScreeningQuestion.BoneJointMuscle]),
    ],
  ])('rejects %s with ValidationFailed', async (_name, invalid) => {
    const { mediator } = await consented();

    await expect(
      mediator.send(saveScreening(invalid as ScreeningSubmission)),
    ).rejects.toMatchObject({ code: AppErrorCode.ValidationFailed });
  });

  it('fails with Unauthorized when signed out and Offline when offline', async () => {
    const out = setupMediator();
    await expect(out.mediator.send(saveScreening(submission()))).rejects.toMatchObject({
      code: AppErrorCode.Unauthorized,
    });

    const offline = setupMediator({ network: { isOnline: () => false } });
    await expect(offline.mediator.send(saveScreening(submission()))).rejects.toMatchObject({
      code: AppErrorCode.Offline,
    });
  });

  it('never lets an answer reach the logger', async () => {
    const { mediator, logLines } = await consented();

    await mediator.send(
      saveScreening(
        submission(
          [ScreeningQuestion.HeartCondition, ScreeningQuestion.BoneJointMuscle],
          [BodyArea.Knee],
        ),
      ),
    );
    await mediator.send(getSafety());

    const logged = JSON.stringify(logLines);
    for (const secret of ['heart-condition', 'bone-joint-muscle', BodyArea.Knee, 'referred']) {
      expect(logged).not.toContain(secret);
    }
    for (const line of logLines) {
      expect(Object.keys(line).sort()).toEqual(['durationMs', 'outcome', 'requestType']);
    }
  });
});

describe('recordDoctorOk through the mediator', () => {
  it('sets Limited mode after a general referral, and is idempotent', async () => {
    const { mediator } = await consented();
    await mediator.send(saveScreening(submission([ScreeningQuestion.ChestPain])));

    const first = await mediator.send(recordDoctorOk());
    const second = await mediator.send(recordDoctorOk());

    expect(first).toMatchObject({
      status: RecordStatus.Saved,
      screening: { trainingMode: TrainingMode.Limited, status: ScreeningStatus.Referred },
    });
    expect(first.status === RecordStatus.Saved && first.screening.doctorOkAt).toBeTruthy();
    expect(second).toEqual(first);
  });

  it('is rejected for pregnancy: there is no Limited path', async () => {
    const { mediator } = await consented();
    await mediator.send(saveScreening(submission([ScreeningQuestion.Pregnancy])));

    expect(await mediator.send(recordDoctorOk())).toEqual({
      status: RecordStatus.Rejected,
      reason: DoctorOkRejection.Pregnancy,
    });
    expect(await mediator.send(getSafety())).toMatchObject({ status: SafetyStatus.Referred });
  });

  it('is rejected without a Screening and after a cleared one', async () => {
    const { mediator } = await consented();
    const expected = { status: RecordStatus.Rejected, reason: DoctorOkRejection.NotReferred };
    expect(await mediator.send(recordDoctorOk())).toEqual(expected);

    await mediator.send(saveScreening(submission()));

    expect(await mediator.send(recordDoctorOk())).toEqual(expected);
  });

  it('does not carry over to a newer Screening that refers again', async () => {
    const { mediator } = await consented();
    await mediator.send(saveScreening(submission([ScreeningQuestion.Fainting])));
    await mediator.send(recordDoctorOk());
    await mediator.send(saveScreening(submission([ScreeningQuestion.Fainting])));

    expect(await mediator.send(getSafety())).toMatchObject({ status: SafetyStatus.Referred });
  });

  it('fails with Unauthorized when signed out', async () => {
    const { mediator } = setupMediator();

    await expect(mediator.send(recordDoctorOk())).rejects.toMatchObject({
      code: AppErrorCode.Unauthorized,
    });
  });
});

describe('exportData and deleteAccount through the mediator', () => {
  it('exports the profile, consents and every Screening with its answers', async () => {
    const { mediator } = await consented();
    await mediator.send(saveScreening(submission([ScreeningQuestion.Breathing])));

    const data = await mediator.send(exportData());

    expect(data.consents.map((consent) => consent.purpose).sort()).toEqual(
      Object.values(ConsentPurpose).sort(),
    );
    expect(data.screenings).toHaveLength(1);
    expect(data.screenings[0]?.answers[ScreeningQuestion.Breathing]).toBe(true);
    expect(data.screenings[0]?.answers[ScreeningQuestion.Fainting]).toBe(false);
  });

  it('deletes everything: the person starts again with consents to give', async () => {
    const { mediator } = await consented();
    await mediator.send(saveScreening(submission([ScreeningQuestion.Fainting])));

    await mediator.send(deleteAccount());

    expect(await mediator.send(getSafety())).toEqual({ status: SafetyStatus.ProfileNeeded });
    expect(await mediator.send(exportData())).toMatchObject({
      profile: null,
      consents: [],
      screenings: [],
    });
  });

  it('keeps one person\u2019s data apart from the next', async () => {
    const { mediator } = await consented();
    await mediator.send(saveScreening(submission([ScreeningQuestion.Fainting])));
    await mediator.send(signOut());
    await mediator.send(verifyEmailCode('grace@example.com', FAKE_AUTH.validCode));

    expect(await mediator.send(getSafety())).toEqual({ status: SafetyStatus.ProfileNeeded });
  });

  it('fail with Unauthorized when signed out', async () => {
    const { mediator } = setupMediator();

    await expect(mediator.send(exportData())).rejects.toMatchObject({
      code: AppErrorCode.Unauthorized,
    });
    await expect(mediator.send(deleteAccount())).rejects.toMatchObject({
      code: AppErrorCode.Unauthorized,
    });
  });
});
