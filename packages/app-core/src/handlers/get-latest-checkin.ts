import { z } from 'zod';
import { defineRequest } from '../define-request.ts';
import { OfflinePolicy } from '../enums/offline-policy.ts';
import { RequestType } from '../enums/request-type.ts';
import type { GetLatestCheckinRequest, Services, Stores } from '../types.ts';
import { mergeLocalCheckin } from '../utils/merge-local-checkin.ts';
import { readThroughCache } from '../utils/read-through-cache.ts';

export const getLatestCheckin = (): GetLatestCheckinRequest => ({
  type: RequestType.GetLatestCheckin,
});

/**
 * The latest Check-in, or null before the first: the server's copy (cached for the next time
 * there is no signal; never fetched counts as none) or the one this device recorded, whichever is
 * newer. `Always`: it never rejects `AppErrorCode.Offline`. Never logged.
 */
export const getLatestCheckinDefinition = defineRequest<GetLatestCheckinRequest, Services, Stores>({
  schema: z.object({ type: z.literal(RequestType.GetLatestCheckin) }),
  offline: OfflinePolicy.Always,
  handler: async (_request, { services }) => {
    const server = await readThroughCache({
      isOnline: () => services.network.isOnline(),
      load: () => services.api.getLatestCheckin(),
      save: (fresh) => services.planCache.saveLatestCheckin(fresh),
      cached: async () => (await services.planCache.readLatestCheckin()) ?? null,
    });
    return mergeLocalCheckin(server, await services.checkins.latest());
  },
});
