import { z } from 'zod';
import { defineRequest } from '../define-request.ts';
import { OfflinePolicy } from '../enums/offline-policy.ts';
import { RequestType } from '../enums/request-type.ts';
import type { GetProgress, Services, Stores } from '../types.ts';
import { readThroughCache } from '../utils/read-through-cache.ts';

export const getProgress = (): GetProgress => ({ type: RequestType.GetProgress });

/**
 * How the week is going, as the server worked it out: Sessions, Activities, the Load bars, the
 * verdict and whether a weigh-in is due. The last answer is cached for the next time there is no
 * signal; `Always` because the handler copes with being offline itself, and rejects
 * `AppErrorCode.Offline` only when Progress was never fetched. Never logged.
 */
export const getProgressDefinition = defineRequest<GetProgress, Services, Stores>({
  schema: z.object({ type: z.literal(RequestType.GetProgress) }),
  offline: OfflinePolicy.Always,
  handler: (_request, { services }) =>
    readThroughCache({
      isOnline: () => services.network.isOnline(),
      load: () => services.api.getProgress(),
      save: (fresh) => services.planCache.saveProgress(fresh),
      cached: () => services.planCache.readProgress(),
    }),
});
