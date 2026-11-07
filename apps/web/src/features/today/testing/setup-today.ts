import { vi } from 'vitest';
import { useToday } from '../composables/useToday.ts';
import type { TimelineExtras } from '../types.ts';
import { createMockMediator } from './create-mock-mediator.ts';

/** Saturday 7 November 2026, evening. */
export const NOW = new Date(2026, 10, 7, 18, 30);

/** `useToday` over a mock mediator and a clock that stands still. */
export function setupToday(extras?: () => TimelineExtras) {
  const mock = createMockMediator();
  const onNavigate = vi.fn();
  const flow = useToday({
    onNavigate,
    mediator: mock.mediator,
    now: () => NOW,
    ...(extras ? { extras } : {}),
  });
  return { flow, ...mock, onNavigate };
}
