import {
  ProgramRejection,
  RecordStatus,
  SportKind,
  type ProfileAnswers,
  type ScreeningSubmission,
} from '@stamina/contracts';
import {
  ConsentPurpose,
  Goal,
  Intensity,
  LaunchSport,
  Need,
  ScreeningQuestion,
  SessionFocus,
  SessionSlot,
  StartingLevel,
  Units,
  Weekday,
} from '@stamina/domain';
import { Locale } from '@stamina/i18n';
import { describe, expect, it } from 'vitest';
import { FAKE_AUTH } from '../config.ts';
import {
  AppErrorCode,
  checkInvite,
  createProgram,
  FAKE_INVITE,
  getProgram,
  grantConsent,
  recordDoctorOk,
  saveProfile,
  saveScreening,
  verifyEmailCode,
} from '../index.ts';
import { setupMediator } from '../testing/setup-mediator.ts';

const EMAIL = 'ada@example.com';
const FOUR_DAYS = [Weekday.Mon, Weekday.Wed, Weekday.Thu, Weekday.Sat];

function profileAnswers(overrides: Partial<ProfileAnswers> = {}): ProfileAnswers {
  return {
    needs: Need.Both,
    birthYear: 1990,
    country: 'GR',
    sport: { kind: SportKind.Launch, sport: LaunchSport.Padel },
    playDays: [Weekday.Tue],
    playVaries: false,
    playMinutes: 90,
    playIntensity: Intensity.Moderate,
    goal: Goal.Strength,
    trainingWeek: { sessionsPerWeek: 3, sessionMinutes: 45, availableDays: FOUR_DAYS },
    locale: Locale.En,
    units: Units.Metric,
    ...overrides,
  };
}

function submission(yes: ScreeningQuestion[] = []): ScreeningSubmission {
  return {
    answers: Object.fromEntries(
      Object.values(ScreeningQuestion).map((question) => [question, yes.includes(question)]),
    ) as Record<ScreeningQuestion, boolean>,
    bodyAreas: [],
    startingLevel: StartingLevel.Beginner,
  };
}

async function signedUp(answers: ProfileAnswers = profileAnswers()) {
  const setup = setupMediator();
  await setup.mediator.send(verifyEmailCode(EMAIL, FAKE_AUTH.validCode));
  await setup.mediator.send(checkInvite(FAKE_INVITE.validCode));
  await setup.mediator.send(saveProfile(answers));
  return setup;
}

async function readyToTrain(answers?: ProfileAnswers, yes: ScreeningQuestion[] = []) {
  const setup = await signedUp(answers);
  for (const purpose of Object.values(ConsentPurpose)) {
    await setup.mediator.send(grantConsent({ purpose, locale: Locale.En }));
  }
  await setup.mediator.send(saveScreening(submission(yes)));
  return setup;
}

describe('createProgram through the mediator', () => {
  it('refuses as not-ready before the Screening is taken', async () => {
    const { mediator } = await signedUp();

    expect(await mediator.send(createProgram())).toEqual({
      status: RecordStatus.Rejected,
      reason: ProgramRejection.NotReady,
    });
    expect(await mediator.send(getProgram())).toBeNull();
  });

  it('refuses a food-only profile with no-training-week', async () => {
    const { mediator } = await readyToTrain(
      profileAnswers({ needs: Need.Food, trainingWeek: undefined }),
    );

    expect(await mediator.send(createProgram())).toEqual({
      status: RecordStatus.Rejected,
      reason: ProgramRejection.NoTrainingWeek,
    });
  });

  it('refuses a referred person without a doctor statement', async () => {
    const { mediator } = await readyToTrain(undefined, [ScreeningQuestion.ChestPain]);

    expect(await mediator.send(createProgram())).toEqual({
      status: RecordStatus.Rejected,
      reason: ProgramRejection.Referred,
    });
  });

  it('plans one Session per chosen day, up to the sessions per week, every slot filled', async () => {
    const { mediator } = await readyToTrain();

    const result = await mediator.send(createProgram());

    if (result.status !== RecordStatus.Saved) throw new Error('expected a saved program');
    const { block, sessions } = result.program;
    expect(block.limited).toBe(false);
    expect(sessions.map(({ weekday }) => weekday)).toHaveLength(3);
    expect(sessions.map(({ focus }) => focus)).toEqual([
      SessionFocus.Lower,
      SessionFocus.Upper,
      SessionFocus.Lower,
    ]);
    for (const session of sessions) {
      expect(session.minutes).toBe(45);
      expect(new Set(session.exercises.map(({ slot }) => slot))).toEqual(
        new Set(Object.values(SessionSlot)),
      );
    }
    expect(sessions.every(({ date }) => date >= block.startsOn)).toBe(true);
  });

  it('caps effort for a Limited person (stop with at least 3 in reserve)', async () => {
    const { mediator } = await readyToTrain(undefined, [ScreeningQuestion.ChestPain]);
    await mediator.send(recordDoctorOk());

    const result = await mediator.send(createProgram());

    if (result.status !== RecordStatus.Saved) throw new Error('expected a saved program');
    expect(result.program.block.limited).toBe(true);
    const rirs = result.program.sessions.flatMap(({ exercises }) =>
      exercises.map(({ rir }) => rir),
    );
    expect(rirs.every((rir) => rir === null || rir >= 3)).toBe(true);
  });

  it('plans no sport-support slot for a Limited person, and keeps the other four filled', async () => {
    const { mediator } = await readyToTrain(undefined, [ScreeningQuestion.ChestPain]);
    await mediator.send(recordDoctorOk());

    const result = await mediator.send(createProgram());

    if (result.status !== RecordStatus.Saved) throw new Error('expected a saved program');
    for (const { exercises } of result.program.sessions) {
      const slots = new Set(exercises.map(({ slot }) => slot));
      expect(slots).toEqual(
        new Set(Object.values(SessionSlot).filter((slot) => slot !== SessionSlot.SportSupport)),
      );
    }
  });

  it('lists the play days of the week as hard Activity days only when play is Hard', async () => {
    const hard = await readyToTrain(
      profileAnswers({ playDays: [Weekday.Tue, Weekday.Fri], playIntensity: Intensity.Hard }),
    );
    const moderate = await readyToTrain();

    const hardWeek = await hard.mediator.send(createProgram());
    const moderateWeek = await moderate.mediator.send(createProgram());

    if (hardWeek.status !== RecordStatus.Saved) throw new Error('expected a saved program');
    if (moderateWeek.status !== RecordStatus.Saved) throw new Error('expected a saved program');
    expect(hardWeek.program.hardActivityDates).toHaveLength(2);
    expect(moderateWeek.program.hardActivityDates).toEqual([]);
  });

  it('returns the stored week unchanged on a repeat, and getProgram reads it', async () => {
    const { mediator } = await readyToTrain();

    const first = await mediator.send(createProgram());
    const second = await mediator.send(createProgram());

    expect(second).toEqual(first);
    if (first.status !== RecordStatus.Saved) throw new Error('expected a saved program');
    expect(await mediator.send(getProgram())).toEqual(first.program);
  });

  it('needs a signed-in person', async () => {
    const { mediator } = setupMediator();

    await expect(mediator.send(getProgram())).rejects.toMatchObject({
      code: AppErrorCode.Unauthorized,
    });
  });
});
