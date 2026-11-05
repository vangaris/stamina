import { AppError, AppErrorCode } from '@stamina/app-core';
import { describe, expect, it, vi } from 'vitest';
import { RoutePath } from '../../../enums/route-path.ts';
import { ProgramMessageKey } from '../enums/program-message-key.ts';
import { ProgramOutcomeKind } from '../enums/program-outcome-kind.ts';
import { ProgramPhase } from '../enums/program-phase.ts';
import { makeProgram } from '../testing/make-program.ts';
import { setupProgram } from '../testing/setup-program.ts';
import type { ProgramOutcome } from '../types.ts';
import { useProgramLoad } from './useProgramLoad.ts';

async function setup(request: () => Promise<ProgramOutcome>) {
  const { mediator } = await setupProgram();
  const onNavigate = vi.fn();
  return { flow: useProgramLoad({ onNavigate, mediator }, request), onNavigate };
}

describe('useProgramLoad', () => {
  it('starts loading, then shows the week it was given', async () => {
    const program = makeProgram();
    const { flow } = await setup(async () => ({ kind: ProgramOutcomeKind.Week, program }));
    expect(flow.phase.value).toBe(ProgramPhase.Loading);

    await flow.load();

    expect(flow.phase.value).toBe(ProgramPhase.Ready);
    expect(flow.program.value).toEqual(program);
  });

  it('explains why there is no week', async () => {
    const { flow } = await setup(async () => ({
      kind: ProgramOutcomeKind.Unavailable,
      messageKey: ProgramMessageKey.NotReady,
    }));

    await flow.load();

    expect(flow.phase.value).toBe(ProgramPhase.Unavailable);
    expect(flow.messageKey.value).toBe(ProgramMessageKey.NotReady);
  });

  it('leaves for the screen the answer points to', async () => {
    const { flow, onNavigate } = await setup(async () => ({
      kind: ProgramOutcomeKind.Leave,
      path: RoutePath.Referred,
    }));

    await flow.load();

    expect(onNavigate).toHaveBeenCalledWith(RoutePath.Referred);
  });

  it('sends a signed-out person back to the start', async () => {
    const { flow, onNavigate } = await setup(async () => {
      throw new AppError(AppErrorCode.Unauthorized);
    });

    await flow.load();

    expect(onNavigate).toHaveBeenCalledWith(RoutePath.Start);
  });

  it('shows the offline message, and the generic one for other failures, with a way to retry', async () => {
    const offline = await setup(async () => {
      throw new AppError(AppErrorCode.Offline);
    });
    await offline.flow.load();
    expect(offline.flow.phase.value).toBe(ProgramPhase.Failed);
    expect(offline.flow.messageKey.value).toBe(ProgramMessageKey.Offline);

    const program = makeProgram();
    let attempts = 0;
    const flaky = await setup(async () => {
      if (attempts++ === 0) throw new Error('boom');
      return { kind: ProgramOutcomeKind.Week, program };
    });
    await flaky.flow.load();
    expect(flaky.flow.messageKey.value).toBe(ProgramMessageKey.Unknown);
    await flaky.flow.load();
    expect(flaky.flow.phase.value).toBe(ProgramPhase.Ready);
  });
});
