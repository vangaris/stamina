import { ConsentPurpose, TrainingMode } from '@stamina/domain';
import { z } from 'zod';
import { defineRequest } from '../define-request.ts';
import { OfflinePolicy } from '../enums/offline-policy.ts';
import { RequestType } from '../enums/request-type.ts';
import { SafetyStatus } from '../enums/safety-status.ts';
import type { GetSafety, SafetyState, Services, Stores } from '../types.ts';

export const getSafety = (): GetSafety => ({ type: RequestType.GetSafety });

/**
 * What the person has to do before the app opens: finish onboarding, give the missing consents,
 * take the Screening, or see the referral; otherwise they are ready. A missing profile comes
 * first (no health question is asked before onboarding's age and region checks), then a consent
 * missing at the current text version, even when an older Screening exists. The Screening itself
 * is never logged (the pipeline logs no results).
 */
export const getSafetyDefinition = defineRequest<GetSafety, Services, Stores>({
  schema: z.object({ type: z.literal(RequestType.GetSafety) }),
  offline: OfflinePolicy.Never,
  handler: async (_request, { services }) => {
    const { profileSaved, granted, screening } = await services.api.getSafety();
    const missing = Object.values(ConsentPurpose).filter((purpose) => !granted.includes(purpose));
    let state: SafetyState;
    if (!profileSaved) state = { status: SafetyStatus.ProfileNeeded };
    else if (missing.length > 0) state = { status: SafetyStatus.ConsentNeeded, missing };
    else if (!screening) state = { status: SafetyStatus.ScreeningNeeded };
    else if (screening.trainingMode === TrainingMode.Referred) {
      state = { status: SafetyStatus.Referred, screening };
    } else state = { status: SafetyStatus.Ready, screening };
    return state;
  },
});
