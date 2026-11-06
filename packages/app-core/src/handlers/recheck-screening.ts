import { recheckScreeningSchema, type RecheckScreening } from '@stamina/contracts';
import { z } from 'zod';
import { defineRequest } from '../define-request.ts';
import { OfflinePolicy } from '../enums/offline-policy.ts';
import { RequestType } from '../enums/request-type.ts';
import type { RecheckScreeningRequest, Services, Stores } from '../types.ts';

export const recheckScreening = (recheck: RecheckScreening): RecheckScreeningRequest => ({
  type: RequestType.RecheckScreening,
  recheck,
});

/**
 * Answers the Screening questions a stop flag asks again; every other answer carries over from
 * the latest Screening on the server, which stores a new Screening like `saveScreening`. No
 * earlier Screening and missing consent are `Rejected` results, not errors. Never logged. The
 * cached cleared Screening is dropped first (a new referral must not be missed offline); the
 * next online `getSafety` caches the new outcome if it is cleared.
 */
export const recheckScreeningDefinition = defineRequest<RecheckScreeningRequest, Services, Stores>({
  schema: z.object({
    type: z.literal(RequestType.RecheckScreening),
    recheck: recheckScreeningSchema,
  }),
  offline: OfflinePolicy.Never,
  handler: async ({ recheck }, { services }) => {
    // Before the send, not after: if the reply is lost the server may have saved a referral.
    await services.planCache.deleteClearedScreening();
    return services.api.recheckScreening(recheck);
  },
});
