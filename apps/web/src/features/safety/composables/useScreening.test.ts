import { AppError, AppErrorCode, FAKE_INVITE } from '@stamina/app-core';
import { ApiError, RecordStatus, ScreeningRejection, SportKind } from '@stamina/contracts';
import {
  BodyArea,
  Goal,
  Intensity,
  LaunchSport,
  Need,
  SCREENING_QUESTIONS,
  ScreeningQuestion,
  StartingLevel,
  Units,
  Weekday,
} from '@stamina/domain';
import { Locale } from '@stamina/i18n';
import { describe, expect, it, vi } from 'vitest';
import { RoutePath } from '../../../enums/route-path.ts';
import { SafetyMessageKey } from '../enums/safety-message-key.ts';
import { SafetyPhase } from '../enums/safety-phase.ts';
import { ScreeningField } from '../enums/screening-field.ts';
import { ScreeningView } from '../enums/screening-view.ts';
import {
  grantBothConsents,
  screeningSubmission,
  setupSafety,
  type SetupSafetyOptions,
} from '../testing/setup-safety.ts';
import { useScreening } from './useScreening.ts';

async function setup(options: SetupSafetyOptions & { consented?: boolean } = {}) {
  const { consented = true, ...rest } = options;
  const { mediator, services } = await setupSafety(rest);
  if (consented && rest.signedIn !== false) await grantBothConsents(services);
  const onNavigate = vi.fn();
  const reveal = vi.fn();
  const flow = useScreening({ onNavigate, mediator, reveal });
  return { flow, onNavigate, reveal, services };
}

type Flow = Awaited<ReturnType<typeof setup>>['flow'];

/** Answers all ten questions no, then the given ones yes, and the starting level. */
function fill(flow: Flow, yes: ScreeningQuestion[] = [], trainedRegularly = false) {
  for (const question of SCREENING_QUESTIONS) flow.answer(question, yes.includes(question));
  flow.setTrainedRegularly(trainedRegularly);
}

describe('useScreening: arriving', () => {
  it('shows the page with nothing answered', async () => {
    const { flow, onNavigate } = await setup();

    await flow.load();

    expect(flow.phase.value).toBe(SafetyPhase.Ready);
    expect(flow.view.value).toBe(ScreeningView.Questions);
    expect(flow.draft.value.answers).toEqual({});
    expect(flow.draft.value.trainedRegularly).toBeUndefined();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('sends someone without a saved profile to onboarding', async () => {
    const { flow, onNavigate } = await setup({ onboarded: false });

    await flow.load();

    expect(onNavigate).toHaveBeenCalledWith(RoutePath.Onboarding);
  });

  it('sends someone without both consents back to the consent screen', async () => {
    const { flow, onNavigate } = await setup({ consented: false });

    await flow.load();

    expect(onNavigate).toHaveBeenCalledWith(RoutePath.Consent);
  });

  it('sends a signed-out person to the start', async () => {
    const { flow, onNavigate } = await setup({ signedIn: false });

    await flow.load();

    expect(onNavigate).toHaveBeenCalledWith(RoutePath.Start);
  });

  it('sends someone who already has a Screening on: Today when ready, Referred when referred', async () => {
    const ready = await setup();
    await ready.services.api.saveScreening(screeningSubmission());
    await ready.flow.load();
    expect(ready.onNavigate).toHaveBeenCalledWith(RoutePath.Today);

    const referred = await setup();
    await referred.services.api.saveScreening(screeningSubmission([ScreeningQuestion.Fainting]));
    await referred.flow.load();
    expect(referred.onNavigate).toHaveBeenCalledWith(RoutePath.Referred);
  });

  it('shows a retry when the state cannot be loaded', async () => {
    const { flow } = await setup({
      api: () => ({ getSafety: () => Promise.reject(new ApiError(500)) }),
    });

    await flow.load();

    expect(flow.phase.value).toBe(SafetyPhase.Failed);
  });
});

describe('useScreening: answering', () => {
  it('names every open question, reveals the first one and sends nothing', async () => {
    const { flow, reveal, services } = await setup();
    await flow.load();
    flow.answer(ScreeningQuestion.HeartCondition, false);

    await flow.submit();

    expect(Object.keys(flow.errors.value)).toHaveLength(SCREENING_QUESTIONS.length);
    expect(flow.errors.value[ScreeningQuestion.HeartCondition]).toBeUndefined();
    expect(flow.errors.value[ScreeningQuestion.ChestPain]).toBe(SafetyMessageKey.AnswerRequired);
    expect(reveal).toHaveBeenCalledExactlyOnceWith(ScreeningQuestion.ChestPain);
    expect((await services.api.getSafety()).screening).toBeNull();
  });

  it('clears the message beside a question once it is answered', async () => {
    const { flow } = await setup();
    await flow.load();
    await flow.submit();

    flow.answer(ScreeningQuestion.Fainting, true);

    expect(flow.errors.value[ScreeningQuestion.Fainting]).toBeUndefined();
    expect(flow.errors.value[ScreeningQuestion.Pregnancy]).toBe(SafetyMessageKey.AnswerRequired);
  });

  it('needs the starting-level answer too', async () => {
    const { flow, reveal } = await setup();
    await flow.load();
    for (const question of SCREENING_QUESTIONS) flow.answer(question, false);

    await flow.submit();

    expect(flow.errors.value).toEqual({
      [ScreeningField.StartingLevel]: SafetyMessageKey.AnswerRequired,
    });
    expect(reveal).toHaveBeenCalledWith(ScreeningField.StartingLevel);
  });

  it('needs at least one area when the bone, joint or muscle question is yes', async () => {
    const { flow, reveal } = await setup();
    await flow.load();
    fill(flow, [ScreeningQuestion.BoneJointMuscle]);

    await flow.submit();

    expect(flow.errors.value).toEqual({
      [ScreeningField.BodyAreas]: SafetyMessageKey.AreasRequired,
    });
    expect(reveal).toHaveBeenCalledWith(ScreeningField.BodyAreas);
    flow.setBodyAreas([BodyArea.Knee]);
    expect(flow.errors.value).toEqual({});
  });

  it('forgets the picked areas when the question turns back to no', async () => {
    const { flow } = await setup();
    await flow.load();
    flow.answer(ScreeningQuestion.BoneJointMuscle, true);
    flow.setBodyAreas([BodyArea.Knee]);

    flow.answer(ScreeningQuestion.BoneJointMuscle, false);

    expect(flow.draft.value.bodyAreas).toEqual([]);
  });
});

describe('useScreening: outcomes', () => {
  it('shows the outcome for all no and goes to the Program reveal on finish', async () => {
    const { flow, onNavigate } = await setup();
    await flow.load();
    fill(flow);

    await flow.submit();

    expect(flow.view.value).toBe(ScreeningView.Outcome);
    expect(flow.outcome.value).toMatchObject({
      goalChanged: false,
      screening: { nutritionOff: false, excludedAreas: [] },
    });
    await flow.finish();
    expect(onNavigate).toHaveBeenCalledWith(RoutePath.Reveal);
  });

  it('records the starting level from the last question', async () => {
    const { flow } = await setup();
    await flow.load();
    fill(flow, [], true);

    await flow.submit();

    expect(flow.outcome.value?.screening.startingLevel).toBe(StartingLevel.Regular);
  });

  it('reports Nutrition off and the excluded areas, and lets training go on', async () => {
    const { flow, onNavigate } = await setup();
    await flow.load();
    fill(flow, [ScreeningQuestion.EatingDisorder, ScreeningQuestion.BoneJointMuscle]);
    flow.setBodyAreas([BodyArea.Knee, BodyArea.Hip]);

    await flow.submit();

    expect(flow.view.value).toBe(ScreeningView.Outcome);
    expect(flow.outcome.value?.screening).toMatchObject({
      nutritionOff: true,
      excludedAreas: [BodyArea.Knee, BodyArea.Hip],
    });
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('says when the body-composition Goal was switched to General fitness', async () => {
    const { flow, services } = await setup();
    // A profile that chose the body-composition Goal before Screening turned Nutrition off.
    await services.api.saveProfile({
      needs: Need.Both,
      birthYear: 1990,
      country: 'GR',
      sport: { kind: SportKind.Launch, sport: LaunchSport.Padel },
      playDays: [Weekday.Tue],
      playVaries: false,
      playMinutes: 90,
      playIntensity: Intensity.Moderate,
      goal: Goal.BodyComposition,
      trainingWeek: {
        sessionsPerWeek: 3,
        sessionMinutes: 45,
        availableDays: [Weekday.Mon, Weekday.Wed, Weekday.Fri],
      },
      locale: Locale.En,
      units: Units.Metric,
      inviteCode: FAKE_INVITE.validCode,
    });
    await flow.load();
    fill(flow, [ScreeningQuestion.EatingDisorder]);

    await flow.submit();

    expect(flow.outcome.value?.goalChanged).toBe(true);
  });

  it.each([
    ['a general referral', ScreeningQuestion.HeartCondition],
    ['a pregnancy referral', ScreeningQuestion.Pregnancy],
  ])('leaves for the Referred screen on %s', async (_name, question) => {
    const { flow, onNavigate } = await setup();
    await flow.load();
    fill(flow, [question]);

    await flow.submit();

    expect(onNavigate).toHaveBeenCalledExactlyOnceWith(RoutePath.Referred);
    expect(flow.view.value).toBe(ScreeningView.Questions);
  });

  it('goes back to the consent screen when the server says consent is missing', async () => {
    const { flow, onNavigate } = await setup({
      api: () => ({
        saveScreening: async () => ({
          status: RecordStatus.Rejected,
          reason: ScreeningRejection.ConsentMissing,
        }),
      }),
    });
    await flow.load();
    fill(flow);

    await flow.submit();

    expect(onNavigate).toHaveBeenCalledWith(RoutePath.Consent);
  });

  it('goes back to onboarding when the server says there is no saved profile', async () => {
    const { flow, onNavigate } = await setup({
      api: () => ({
        saveScreening: async () => ({
          status: RecordStatus.Rejected,
          reason: ScreeningRejection.ProfileMissing,
        }),
      }),
    });
    await flow.load();
    fill(flow);

    await flow.submit();

    expect(onNavigate).toHaveBeenCalledExactlyOnceWith(RoutePath.Onboarding);
  });
});

describe('useScreening: failing', () => {
  it('explains being offline and keeps the answers', async () => {
    const { flow } = await setup({
      api: () => ({ saveScreening: () => Promise.reject(new AppError(AppErrorCode.Offline)) }),
    });
    await flow.load();
    fill(flow, [ScreeningQuestion.Fainting]);

    await flow.submit();

    expect(flow.errorKey.value).toBe(SafetyMessageKey.ScreeningOffline);
    expect(flow.draft.value.answers[ScreeningQuestion.Fainting]).toBe(true);
    expect(flow.busy.value).toBe(false);
  });

  it('shows a generic message for a server error and goes to the start when the session ended', async () => {
    const failing = await setup({
      api: () => ({ saveScreening: () => Promise.reject(new ApiError(500)) }),
    });
    await failing.flow.load();
    fill(failing.flow);
    await failing.flow.submit();
    expect(failing.flow.errorKey.value).toBe(SafetyMessageKey.ScreeningUnknown);

    const expired = await setup({
      api: () => ({ saveScreening: () => Promise.reject(new ApiError(401)) }),
    });
    await expired.flow.load();
    fill(expired.flow);
    await expired.flow.submit();
    expect(expired.onNavigate).toHaveBeenCalledWith(RoutePath.Start);
  });
});
