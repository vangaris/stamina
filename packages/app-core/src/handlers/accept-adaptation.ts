import { adaptationSchema, type Adaptation } from '@stamina/contracts';
import { z } from 'zod';
import { defineRequest } from '../define-request.ts';
import { OfflinePolicy } from '../enums/offline-policy.ts';
import { RequestType } from '../enums/request-type.ts';
import type { AcceptAdaptationRequest, Services, Stores } from '../types.ts';
import { removeCachedAdaptation } from '../utils/remove-cached-adaptation.ts';

/** The suggestion as the card showed it: its `basis` goes to the server, which refuses it when the Program moved on. */
export const acceptAdaptation = (adaptation: Adaptation): AcceptAdaptationRequest => ({
  type: RequestType.AcceptAdaptation,
  adaptation,
});

/**
 * Takes the card off the device first, then sends the accept with the suggestion's basis;
 * offline (or when the network drops mid-send) it waits in the offline queue and resolves
 * `QUEUED_RESULT`, and the sync applies it. On `Saved` the Program as it now is replaces the
 * cached one and the Session details the revision superseded are dropped (they are fetched
 * again). A `Rejected` answer (`Stale`, `AlreadyDecided`) is a result, not an error: the latest
 * Program, when the server sent one, is cached the same way and the card stays gone, so the
 * screen can show the plan as it is. A permanent client error takes nothing back: the card
 * returns with the next fetch if it still applies. Never logged: what is suggested follows from
 * health data.
 */
export const acceptAdaptationDefinition = defineRequest<AcceptAdaptationRequest, Services, Stores>({
  schema: z.object({
    type: z.literal(RequestType.AcceptAdaptation),
    adaptation: adaptationSchema,
  }),
  offline: OfflinePolicy.Queue,
  writeLocal: ({ adaptation }, services) =>
    removeCachedAdaptation(services.planCache, adaptation.id),
  handler: async ({ adaptation }, { services }) => {
    const result = await services.api.acceptAdaptation(adaptation.id, { basis: adaptation.basis });
    if (result.program) {
      await services.planCache.saveProgram(result.program);
      await Promise.all(
        adaptation.basis.map(({ sessionId }) => services.planCache.deleteSessionDetail(sessionId)),
      );
    }
    return result;
  },
});
