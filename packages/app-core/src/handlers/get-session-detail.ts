import { z } from 'zod';
import { defineRequest } from '../define-request.ts';
import { OfflinePolicy } from '../enums/offline-policy.ts';
import { RequestType } from '../enums/request-type.ts';
import type { GetSessionDetail, Services, Stores } from '../types.ts';
import { mergeLocalSessionLog } from '../utils/merge-local-session-log.ts';
import { readThroughCache } from '../utils/read-through-cache.ts';

export const getSessionDetail = (sessionId: string): GetSessionDetail => ({
  type: RequestType.GetSessionDetail,
  sessionId,
});

/**
 * One Session as the Session screen shows it: the server's copy (cached for the next time there
 * is no signal) with this device's sets and finish that the server does not show yet merged in.
 * `Always` because the handler copes with being offline itself; it rejects `AppErrorCode.Offline`
 * only for a Session never opened online. Never logged.
 */
export const getSessionDetailDefinition = defineRequest<GetSessionDetail, Services, Stores>({
  schema: z.object({ type: z.literal(RequestType.GetSessionDetail), sessionId: z.uuid() }),
  offline: OfflinePolicy.Always,
  handler: async ({ sessionId }, { services }) => {
    const detail = await readThroughCache({
      isOnline: () => services.network.isOnline(),
      load: () => services.api.getSession(sessionId),
      save: (fresh) => services.planCache.saveSessionDetail(fresh),
      cached: () => services.planCache.readSessionDetail(sessionId),
    });
    return mergeLocalSessionLog(detail, await services.sessionLog.read(sessionId));
  },
});
