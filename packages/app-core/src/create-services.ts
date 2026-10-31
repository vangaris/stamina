import { createApiClient } from '@stamina/contracts';
import { ServicesMode } from './enums/services-mode.ts';
import { createBetterAuthService } from './services/create-better-auth-service.ts';
import { createBrowserNetwork } from './services/create-browser-network.ts';
import { createConsoleLogger } from './services/create-console-logger.ts';
import { createFakeApiClient } from './services/create-fake-api-client.ts';
import { createFakeAuthService } from './services/create-fake-auth-service.ts';
import { createMemoryOfflineQueue } from './services/create-memory-offline-queue.ts';
import { createSilentLogger } from './services/create-silent-logger.ts';
import { createSystemClock } from './services/create-system-clock.ts';
import type { Services, ServicesEnv } from './types.ts';

/** Test and Dev share the in-memory fakes; Dev uses the console, the system clock and the browser's network state; Test is silent, fixed-time and always online. */
export function createServices(env: ServicesEnv): Services {
  switch (env.mode) {
    case ServicesMode.Test:
    case ServicesMode.Dev: {
      const auth = createFakeAuthService();
      const test = env.mode === ServicesMode.Test;
      return {
        api: createFakeApiClient(() => auth.getToken()),
        auth,
        logger: test ? createSilentLogger() : createConsoleLogger(),
        clock: test ? { now: () => 0 } : createSystemClock(),
        network: test ? { isOnline: () => true } : createBrowserNetwork(),
        offlineQueue: createMemoryOfflineQueue(),
      };
    }
    case ServicesMode.Production: {
      const fetchOption = env.fetch ? { fetch: env.fetch } : {};
      const auth = createBetterAuthService({ authUrl: env.authUrl, ...fetchOption });
      return {
        api: createApiClient({
          baseUrl: env.apiBaseUrl,
          getToken: () => auth.getToken(),
          ...fetchOption,
        }),
        auth,
        logger: createConsoleLogger(),
        clock: createSystemClock(),
        network: createBrowserNetwork(),
        offlineQueue: createMemoryOfflineQueue(),
      };
    }
  }
}
