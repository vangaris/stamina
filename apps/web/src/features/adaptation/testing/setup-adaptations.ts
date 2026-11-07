import type { Adaptation } from '@stamina/contracts';
import { Weekday } from '@stamina/domain';
import { vi } from 'vitest';
import { useAdaptations } from '../composables/useAdaptations.ts';
import { createMockMediator } from './create-mock-mediator.ts';

/** `useAdaptations` over a mock mediator, with weekday names that are the weekday ids. */
export function setupAdaptations(pending: Adaptation[] = []) {
  const mock = createMockMediator();
  mock.state.adaptations = pending;
  const onNavigate = vi.fn();
  const flow = useAdaptations({
    onNavigate,
    weekdayLabel: (weekday: Weekday) => weekday,
    mediator: mock.mediator,
  });
  return { flow, ...mock, onNavigate };
}
