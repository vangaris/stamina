import { z } from 'zod';
import { defineRequest } from '../define-request.ts';
import { OfflinePolicy } from '../enums/offline-policy.ts';
import { RequestType } from '../enums/request-type.ts';
import type { GetAdaptationsRequest, Services, Stores } from '../types.ts';
import { queuedAdaptationDecisions } from '../utils/queued-adaptation-decisions.ts';
import { readThroughCache } from '../utils/read-through-cache.ts';

export const getAdaptations = (): GetAdaptationsRequest => ({
  type: RequestType.GetAdaptations,
});

/**
 * The pending Adaptation suggestions that still apply, oldest first. The last list fetched is
 * cached so the cards show without signal; `Always` because the handler copes with being
 * offline itself (`AppErrorCode.Offline` only when no list was ever fetched). A suggestion the
 * person decided on this device and that still waits in the offline queue is left out, online or
 * not, so a decided card does not come back before the server has the decision. Never logged:
 * what is suggested follows from health data.
 */
export const getAdaptationsDefinition = defineRequest<GetAdaptationsRequest, Services, Stores>({
  schema: z.object({ type: z.literal(RequestType.GetAdaptations) }),
  offline: OfflinePolicy.Always,
  handler: async (_request, { services }) => {
    const adaptations = await readThroughCache({
      isOnline: () => services.network.isOnline(),
      load: async () => (await services.api.getAdaptations()).adaptations,
      save: (fresh) => services.planCache.saveAdaptations(fresh),
      cached: () => services.planCache.readAdaptations(),
    });
    const decided = await queuedAdaptationDecisions(services.offlineQueue);
    return adaptations.filter(({ id }) => !decided.has(id));
  },
});
