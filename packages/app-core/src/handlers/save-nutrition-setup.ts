import { nutritionSetupSchema, type NutritionSetup } from '@stamina/contracts';
import { z } from 'zod';
import { defineRequest } from '../define-request.ts';
import { OfflinePolicy } from '../enums/offline-policy.ts';
import { RequestType } from '../enums/request-type.ts';
import type { SaveNutritionSetupRequest, Services, Stores } from '../types.ts';

export const saveNutritionSetup = (setup: NutritionSetup): SaveNutritionSetupRequest => ({
  type: RequestType.SaveNutritionSetup,
  setup,
});

/**
 * Saves the Unlock Meals setup. Online only: offline it rejects `AppErrorCode.Offline` and
 * nothing is kept, so the person tries again with signal. A setup outside the accepted bounds is
 * rejected by the schema before anything is sent; `Rejected` (Nutrition off, or a body direction
 * without a body-composition Goal) is a result, not an error. Never logged: sex, height, weight,
 * allergens and dislikes are health data.
 */
export const saveNutritionSetupDefinition = defineRequest<
  SaveNutritionSetupRequest,
  Services,
  Stores
>({
  schema: z.object({
    type: z.literal(RequestType.SaveNutritionSetup),
    setup: nutritionSetupSchema,
  }),
  offline: OfflinePolicy.Never,
  handler: ({ setup }, { services }) => services.api.saveNutritionSetup(setup),
});
