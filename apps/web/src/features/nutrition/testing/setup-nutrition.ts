import { vi } from 'vitest';
import { useNutrition } from '../composables/useNutrition.ts';
import { createMockMediator, LOCAL_NOW } from './create-mock-mediator.ts';

/** `useNutrition` over a mock mediator and a clock that stands still. */
export function setupNutrition() {
  const mock = createMockMediator();
  const onNavigate = vi.fn();
  let nextId = 0;
  const flow = useNutrition({
    onNavigate,
    mediator: mock.mediator,
    now: () => LOCAL_NOW,
    newId: () => `water-${(nextId += 1)}`,
  });
  return { flow, ...mock, onNavigate };
}
