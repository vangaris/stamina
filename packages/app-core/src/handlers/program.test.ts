import { ProgramRejection, RecordStatus } from '@stamina/contracts';
import {
  Intensity,
  Need,
  ScreeningQuestion,
  SessionFocus,
  SessionSlot,
  Weekday,
} from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { AppErrorCode, createProgram, getProgram, recordDoctorOk } from '../index.ts';
import { buildProfileAnswers } from '../testing/build-profile-answers.ts';
import { readyToTrain } from '../testing/ready-to-train.ts';
import { setupMediator } from '../testing/setup-mediator.ts';
import { signedUp } from '../testing/signed-up.ts';

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
      buildProfileAnswers({ needs: Need.Food, trainingWeek: undefined }),
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
      buildProfileAnswers({ playDays: [Weekday.Tue, Weekday.Fri], playIntensity: Intensity.Hard }),
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
