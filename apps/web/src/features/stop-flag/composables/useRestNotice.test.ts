import { AppError, AppErrorCode, SafetyStatus } from '@stamina/app-core';
import { describe, expect, it } from 'vitest';
import { createMockMediator } from '../testing/create-mock-mediator.ts';
import { makeScreening, makeStop } from '../testing/make-safety-state.ts';
import { useRestNotice } from './useRestNotice.ts';

const NOW = new Date(2026, 10, 6, 9, 0);

function setup(restOn: string | null) {
  const mock = createMockMediator();
  mock.state.safety = {
    status: SafetyStatus.Ready,
    screening: makeScreening(),
    stop: makeStop({ restOn }),
  };
  return { flow: useRestNotice({ mediator: mock.mediator, now: () => NOW }), ...mock };
}

describe('useRestNotice', () => {
  it("shows the notice on the day of a fever, by the person's own calendar", async () => {
    const { flow } = setup('2026-11-06');

    await flow.load();

    expect(flow.visible.value).toBe(true);
  });

  it('shows nothing on another day or without a fever', async () => {
    const yesterday = setup('2026-11-05');
    const none = setup(null);

    await yesterday.flow.load();
    await none.flow.load();

    expect(yesterday.flow.visible.value).toBe(false);
    expect(none.flow.visible.value).toBe(false);
  });

  it('shows nothing when the state cannot be read', async () => {
    const { flow, state } = setup('2026-11-06');
    state.safety = new AppError(AppErrorCode.Offline);

    await flow.load();

    expect(flow.visible.value).toBe(false);
  });
});
