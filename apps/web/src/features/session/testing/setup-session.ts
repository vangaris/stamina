import { Locale } from '@stamina/i18n';
import { vi } from 'vitest';
import { useSession } from '../composables/useSession.ts';
import type { SwapStorage } from '../types.ts';
import { createSwapStore } from '../utils/create-swap-store.ts';
import { createMockMediator } from './create-mock-mediator.ts';
import { makeSessionDetail } from './make-session-detail.ts';

export interface SetupSessionOptions {
  detail?: Parameters<typeof createMockMediator>[0];
  /** What the swap store starts with, as raw storage entries. */
  storage?: Record<string, string>;
  locale?: Locale;
  /** The id the screen is opened with, when it is not the detail's own (an older revision). */
  sessionId?: string;
}

export function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const storage: SwapStorage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
  return { data, storage };
}

/** `useSession` over a mock mediator, in-memory storage, a fake wake lock and ids that count up. */
export function setupSession({
  detail = makeSessionDetail(),
  storage: initialStorage,
  locale = Locale.En,
  sessionId = detail.id,
}: SetupSessionOptions = {}) {
  const mock = createMockMediator(detail);
  const { data, storage } = memoryStorage(initialStorage);
  const swapStore = createSwapStore(storage);
  const onNavigate = vi.fn();
  const release = vi.fn();
  const keepAwake = vi.fn(() => release);
  let ids = 0;
  const newId = () => `10000000-0000-4000-8000-${String(++ids).padStart(12, '0')}`;
  const flow = useSession({
    sessionId,
    locale: () => locale,
    onNavigate,
    mediator: mock.mediator,
    swapStore,
    keepAwake,
    newId,
  });
  return { flow, ...mock, onNavigate, keepAwake, release, storage: data, swapStore };
}
