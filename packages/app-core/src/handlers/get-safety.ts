import { ConsentPurpose, TrainingMode } from '@stamina/domain';
import { z } from 'zod';
import { defineRequest } from '../define-request.ts';
import { OfflinePolicy } from '../enums/offline-policy.ts';
import { RequestType } from '../enums/request-type.ts';
import { SafetyStatus } from '../enums/safety-status.ts';
import type { GetSafety, SafetyState, Services, Stores } from '../types.ts';
import { readThroughCache } from '../utils/read-through-cache.ts';

export const getSafety = (): GetSafety => ({ type: RequestType.GetSafety });

/**
 * What the person has to do before the app opens: finish onboarding, give the missing consents,
 * take the Screening, or see the referral; otherwise they are ready. A missing profile comes
 * first (no health question is asked before onboarding's age and region checks), then a consent
 * missing at the current text version, even when an older Screening exists. The Screening itself
 * is never logged (the pipeline logs no results).
 *
 * `Always`, so a person already cleared reaches the app without signal. Only a `Ready` state is
 * ever cached, and any other answer from the server deletes it: offline serves a remembered
 * `Ready` or, with none, rejects `AppErrorCode.Offline` (the guard then sends the person to
 * Screening). A non-Ready state is never served from the cache.
 */
export const getSafetyDefinition = defineRequest<GetSafety, Services, Stores>({
  schema: z.object({ type: z.literal(RequestType.GetSafety) }),
  offline: OfflinePolicy.Always,
  handler: (_request, { services }) =>
    readThroughCache<SafetyState>({
      isOnline: () => services.network.isOnline(),
      load: () => deriveSafety(services),
      save: async (state) => {
        if (state.status === SafetyStatus.Ready) {
          await services.planCache.saveClearedScreening(state.screening);
        } else await services.planCache.deleteClearedScreening();
      },
      cached: async () => {
        const screening = await services.planCache.readClearedScreening();
        return screening && { status: SafetyStatus.Ready, screening };
      },
    }),
});

async function deriveSafety(services: Services): Promise<SafetyState> {
  const { profileSaved, granted, screening } = await services.api.getSafety();
  const missing = Object.values(ConsentPurpose).filter((purpose) => !granted.includes(purpose));
  if (!profileSaved) return { status: SafetyStatus.ProfileNeeded };
  if (missing.length > 0) return { status: SafetyStatus.ConsentNeeded, missing };
  if (!screening) return { status: SafetyStatus.ScreeningNeeded };
  if (screening.trainingMode === TrainingMode.Referred) {
    return { status: SafetyStatus.Referred, screening };
  }
  return { status: SafetyStatus.Ready, screening };
}
