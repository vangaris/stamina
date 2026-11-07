import { z } from 'zod';
import { defineRequest } from '../define-request.ts';
import { OfflinePolicy } from '../enums/offline-policy.ts';
import { RequestType } from '../enums/request-type.ts';
import type { DeclineAdaptationRequest, Services, Stores } from '../types.ts';
import { removeCachedAdaptation } from '../utils/remove-cached-adaptation.ts';

export const declineAdaptation = (adaptationId: string): DeclineAdaptationRequest => ({
  type: RequestType.DeclineAdaptation,
  adaptationId,
});

/**
 * "Keep my plan": takes the card off the device first, then sends the decision; offline (or when
 * the network drops mid-send) it waits in the offline queue and resolves `QUEUED_RESULT`. A
 * `Rejected` answer (accepted already) is a result, not an error, and the card stays gone. Never
 * logged: what is suggested follows from health data.
 */
export const declineAdaptationDefinition = defineRequest<
  DeclineAdaptationRequest,
  Services,
  Stores
>({
  schema: z.object({
    type: z.literal(RequestType.DeclineAdaptation),
    adaptationId: z.uuid(),
  }),
  offline: OfflinePolicy.Queue,
  writeLocal: ({ adaptationId }, services) =>
    removeCachedAdaptation(services.planCache, adaptationId),
  handler: ({ adaptationId }, { services }) => services.api.declineAdaptation(adaptationId),
});
