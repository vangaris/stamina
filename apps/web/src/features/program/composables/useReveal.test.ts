import { ApiError, ProgramRejection, RecordStatus } from '@stamina/contracts';
import { Need, ScreeningQuestion } from '@stamina/domain';
import { describe, expect, it, vi } from 'vitest';
import { RoutePath } from '../../../enums/route-path.ts';
import { ProgramMessageKey } from '../enums/program-message-key.ts';
import { ProgramPhase } from '../enums/program-phase.ts';
import {
  profileAnswers,
  setupProgram,
  type SetupProgramOptions,
} from '../testing/setup-program.ts';
import { useReveal } from './useReveal.ts';

async function setup(options: SetupProgramOptions = {}) {
  const { mediator, services } = await setupProgram(options);
  const onNavigate = vi.fn();
  return { flow: useReveal({ onNavigate, mediator }), onNavigate, services };
}

describe('useReveal', () => {
  it('creates the Program and shows its first week', async () => {
    const { flow } = await setup();

    await flow.load();

    expect(flow.phase.value).toBe(ProgramPhase.Ready);
    expect(flow.program.value?.sessions).toHaveLength(3);
  });

  it('shows the same week when reloaded', async () => {
    const { flow, services } = await setup();
    await flow.load();
    const first = flow.program.value;

    await flow.load();

    expect(flow.program.value).toEqual(first);
    expect(await services.api.getProgram()).toEqual(first);
  });

  it('sends a referred person to the Referred screen', async () => {
    const { flow, onNavigate } = await setup({ screeningYes: [ScreeningQuestion.HeartCondition] });

    await flow.load();

    expect(onNavigate).toHaveBeenCalledWith(RoutePath.Referred);
  });

  it('sends a person whose training is paused to the paused screen', async () => {
    const { flow, onNavigate } = await setup({
      api: () => ({
        createProgram: async () => ({
          status: RecordStatus.Rejected,
          reason: ProgramRejection.Paused,
        }),
      }),
    });

    await flow.load();

    expect(onNavigate).toHaveBeenCalledWith(RoutePath.Paused);
  });

  it('explains a food-only profile calmly', async () => {
    const { flow } = await setup({
      answers: profileAnswers({ needs: Need.Food, trainingWeek: undefined }),
    });

    await flow.load();

    expect(flow.phase.value).toBe(ProgramPhase.Unavailable);
    expect(flow.messageKey.value).toBe(ProgramMessageKey.NoTrainingWeek);
  });

  it('explains a person who has not finished the Screening', async () => {
    const { flow } = await setup({ screeningYes: null });

    await flow.load();

    expect(flow.messageKey.value).toBe(ProgramMessageKey.NotReady);
  });

  it('explains a library that cannot fill every slot', async () => {
    const { flow } = await setup({
      api: () => ({
        createProgram: async () => ({
          status: RecordStatus.Rejected,
          reason: ProgramRejection.NoExercises,
        }),
      }),
    });

    await flow.load();

    expect(flow.messageKey.value).toBe(ProgramMessageKey.NoExercises);
  });

  it('shows a retry when the request fails, and the start screen when signed out', async () => {
    const failing = await setup({
      api: () => ({
        createProgram: async () => {
          throw new ApiError(500);
        },
      }),
    });
    await failing.flow.load();
    expect(failing.flow.phase.value).toBe(ProgramPhase.Failed);
    expect(failing.flow.messageKey.value).toBe(ProgramMessageKey.Unknown);

    const signedOut = await setup({ signedIn: false });
    await signedOut.flow.load();
    expect(signedOut.onNavigate).toHaveBeenCalledWith(RoutePath.Start);
  });

  it('continues to Today', async () => {
    const { flow, onNavigate } = await setup();

    flow.continueOn();

    expect(onNavigate).toHaveBeenCalledWith(RoutePath.Today);
  });
});
