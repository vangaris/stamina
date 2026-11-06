import { consentGrantSchema, type ConsentState } from '@stamina/contracts';
import { z } from 'zod';
import { defineRequest } from '../define-request.ts';
import { OfflinePolicy } from '../enums/offline-policy.ts';
import { RequestType } from '../enums/request-type.ts';
import type { GrantConsent, Services, Stores } from '../types.ts';

export const grantConsent = (grant: GrantConsent['grant']): GrantConsent => ({
  type: RequestType.GrantConsent,
  grant,
});

/** Records one consent in the language of the text the person read. Granting twice is harmless.
 * Drops the cached cleared Screening first; the next online `getSafety` re-derives it. */
export const grantConsentDefinition = defineRequest<GrantConsent, Services, Stores>({
  schema: z.object({ type: z.literal(RequestType.GrantConsent), grant: consentGrantSchema }),
  offline: OfflinePolicy.Never,
  handler: async ({ grant }, { services }): Promise<ConsentState> => {
    await services.planCache.deleteClearedScreening();
    return services.api.grantConsent(grant);
  },
});
