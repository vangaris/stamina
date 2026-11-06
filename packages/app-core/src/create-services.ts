import { createApiClient } from '@stamina/contracts';
import { ServicesMode } from './enums/services-mode.ts';
import { createBetterAuthService } from './services/create-better-auth-service.ts';
import { createBrowserInviteStorage } from './services/create-browser-invite-storage.ts';
import { createBrowserNetwork } from './services/create-browser-network.ts';
import { createDexieLocalData } from './services/create-dexie-local-data.ts';
import { createDexieOfflineQueue } from './services/create-dexie-offline-queue.ts';
import { createDexiePlanCache } from './services/create-dexie-plan-cache.ts';
import { createDexieSessionLog } from './services/create-dexie-session-log.ts';
import { createConsoleLogger } from './services/create-console-logger.ts';
import { createFixedClock } from './services/create-fixed-clock.ts';
import { createFakeApiClient } from './services/create-fake-api-client.ts';
import { createFakeAuthService } from './services/create-fake-auth-service.ts';
import { createLocalDatabase } from './services/create-local-database.ts';
import { createMemoryInviteStorage } from './services/create-memory-invite-storage.ts';
import { createMemoryLocalData } from './services/create-memory-local-data.ts';
import { createMemoryOfflineQueue } from './services/create-memory-offline-queue.ts';
import { createMemoryPlanCache } from './services/create-memory-plan-cache.ts';
import { createMemorySessionLog } from './services/create-memory-session-log.ts';
import { createSilentLogger } from './services/create-silent-logger.ts';
import { createSystemClock } from './services/create-system-clock.ts';
import type { Services, ServicesEnv } from './types.ts';

/** Test and Dev share the in-memory fakes (queue, session log, plan cache and local data included; Production keeps them in IndexedDB); Dev uses the console, the system clock and the browser's network state; Test is silent, fixed-time and always online. */
export function createServices(env: ServicesEnv): Services {
  switch (env.mode) {
    case ServicesMode.Test:
    case ServicesMode.Dev: {
      const auth = createFakeAuthService();
      const test = env.mode === ServicesMode.Test;
      const offlineQueue = createMemoryOfflineQueue();
      const sessionLog = createMemorySessionLog();
      const planCache = createMemoryPlanCache();
      return {
        api: createFakeApiClient(() => auth.getToken()),
        auth,
        inviteStorage: createMemoryInviteStorage(),
        logger: test ? createSilentLogger() : createConsoleLogger(),
        clock: test ? createFixedClock() : createSystemClock(),
        network: test ? { isOnline: () => true } : createBrowserNetwork(),
        offlineQueue,
        sessionLog,
        planCache,
        localData: createMemoryLocalData([offlineQueue, sessionLog, planCache]),
      };
    }
    case ServicesMode.Production: {
      const fetchOption = env.fetch ? { fetch: env.fetch } : {};
      const auth = createBetterAuthService({ authUrl: env.authUrl, ...fetchOption });
      const database = createLocalDatabase();
      return {
        api: createApiClient({
          baseUrl: env.apiBaseUrl,
          getToken: () => auth.getToken(),
          ...fetchOption,
        }),
        auth,
        inviteStorage: createBrowserInviteStorage(),
        logger: createConsoleLogger(),
        clock: createSystemClock(),
        network: createBrowserNetwork(),
        offlineQueue: createDexieOfflineQueue(database),
        sessionLog: createDexieSessionLog(database),
        planCache: createDexiePlanCache(database),
        localData: createDexieLocalData(database),
      };
    }
  }
}
