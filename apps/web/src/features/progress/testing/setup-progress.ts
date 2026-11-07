import { Locale } from '@stamina/i18n';
import { vi } from 'vitest';
import { useProgress } from '../composables/useProgress.ts';
import { createMockMediator, LOCAL_NOW } from './create-mock-mediator.ts';

/** `useProgress` over a mock mediator, English. */
export function setupProgress() {
  const mock = createMockMediator();
  const onNavigate = vi.fn();
  const flow = useProgress({
    onNavigate,
    locale: () => Locale.En,
    mediator: mock.mediator,
    now: () => LOCAL_NOW,
  });
  return { flow, ...mock, onNavigate };
}
