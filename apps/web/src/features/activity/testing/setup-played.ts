import { vi } from 'vitest';
import { usePlayed } from '../composables/usePlayed.ts';
import { createMockMediator } from './create-mock-mediator.ts';

export const TODAY = new Date(2026, 10, 6, 18, 30);

/** `usePlayed` over a mock mediator, ids that count up and a clock that stands still. */
export function setupPlayed() {
  const mock = createMockMediator();
  const onNavigate = vi.fn();
  let ids = 0;
  const newId = () => `10000000-0000-4000-8000-${String(++ids).padStart(12, '0')}`;
  const flow = usePlayed({
    onNavigate,
    sportLabel: (sport) => sport,
    mediator: mock.mediator,
    newId,
    now: () => TODAY,
  });
  return { flow, ...mock, onNavigate };
}
