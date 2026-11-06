import { createAppSync } from '../create-app-sync.ts';
import type { Services } from '../types.ts';
import { setupMediator } from './setup-mediator.ts';
import type { setupSession } from './setup-session.ts';

/**
 * The same person on the same device after the app was closed and opened again: a new mediator
 * and sync over the given services (new adapters on the same IndexedDB), talking to the same
 * server. It starts offline; flip `network.online` to bring it back.
 */
export function reloadSession(
  previous: Awaited<ReturnType<typeof setupSession>>,
  services: Partial<Services>,
) {
  const network = { online: false };
  const setup = setupMediator({
    api: previous.services.api,
    auth: previous.services.auth,
    network: { isOnline: () => network.online },
    ...services,
  });
  const sync = createAppSync({ services: setup.services, stores: setup.stores });
  return { ...setup, network, sync };
}
