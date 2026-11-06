import { z } from 'zod';
import { defineRequest } from '../define-request.ts';
import { OfflinePolicy } from '../enums/offline-policy.ts';
import { RequestType } from '../enums/request-type.ts';
import type { GetProgram, Services, Stores } from '../types.ts';
import { readThroughCache } from '../utils/read-through-cache.ts';

export const getProgram = (): GetProgram => ({ type: RequestType.GetProgram });

/**
 * The first week of the person's Program, or null before one is created. The last week fetched is
 * cached so it opens without signal; `Always` because the handler copes with being offline itself
 * (`AppErrorCode.Offline` only when no week was ever fetched). Never logged.
 */
export const getProgramDefinition = defineRequest<GetProgram, Services, Stores>({
  schema: z.object({ type: z.literal(RequestType.GetProgram) }),
  offline: OfflinePolicy.Always,
  handler: (_request, { services }) =>
    readThroughCache({
      isOnline: () => services.network.isOnline(),
      load: () => services.api.getProgram(),
      save: async (program) => {
        if (program) await services.planCache.saveProgram(program);
      },
      cached: () => services.planCache.readProgram(),
    }),
});
