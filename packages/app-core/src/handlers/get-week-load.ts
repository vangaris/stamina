import { z } from 'zod';
import { defineRequest } from '../define-request.ts';
import { OfflinePolicy } from '../enums/offline-policy.ts';
import { RequestType } from '../enums/request-type.ts';
import type { GetWeekLoad, Services, Stores } from '../types.ts';
import { mergeLocalActivities } from '../utils/merge-local-activities.ts';
import { readThroughCache } from '../utils/read-through-cache.ts';

export const getWeekLoad = (): GetWeekLoad => ({ type: RequestType.GetWeekLoad });

/**
 * The week as the Load screen shows it: the server's copy (cached for the next time there is no
 * signal) with the Activities this device logged that the server does not show yet merged in.
 * `Always` because the handler copes with being offline itself; it rejects `AppErrorCode.Offline`
 * only when the week was never fetched. Never logged.
 */
export const getWeekLoadDefinition = defineRequest<GetWeekLoad, Services, Stores>({
  schema: z.object({ type: z.literal(RequestType.GetWeekLoad) }),
  offline: OfflinePolicy.Always,
  handler: async (_request, { services }) => {
    const week = await readThroughCache({
      isOnline: () => services.network.isOnline(),
      load: () => services.api.getWeekLoad(),
      save: (fresh) => services.planCache.saveWeekLoad(fresh),
      cached: () => services.planCache.readWeekLoad(),
    });
    return mergeLocalActivities(week, await services.activityLog.list());
  },
});
