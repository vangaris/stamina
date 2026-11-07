import { z } from 'zod';
import { defineRequest } from '../define-request.ts';
import { OfflinePolicy } from '../enums/offline-policy.ts';
import { RequestType } from '../enums/request-type.ts';
import type { GetNutritionRequest, Services, Stores } from '../types.ts';
import { mergeLocalWater } from '../utils/merge-local-water.ts';
import { mergeLocalMeals } from '../utils/merge-local-meals.ts';
import { readThroughCache } from '../utils/read-through-cache.ts';

/** `date` is the person's calendar day, `YYYY-MM-DD`. */
export const getNutrition = (date: string): GetNutritionRequest => ({
  type: RequestType.GetNutrition,
  date,
});

/**
 * Meals for one day as the server worked it out (locked, off, or the day's targets), cached for
 * the next time there is no signal (the latest day fetched is kept), with the water this device
 * logged that the server does not show yet added to the day's total. `Always` because the
 * handler copes with being offline itself; it rejects `AppErrorCode.Offline` only when that day
 * was never fetched. Meal ideas come from the server's answer (cached with it), and the meal
 * logs this device made that the server does not show yet override their slots' statuses. Never
 * logged: targets, body stats, water and meal logs are health data.
 */
export const getNutritionDefinition = defineRequest<GetNutritionRequest, Services, Stores>({
  schema: z.object({
    type: z.literal(RequestType.GetNutrition),
    date: z.iso.date(),
  }),
  offline: OfflinePolicy.Always,
  handler: async ({ date }, { services }) => {
    const nutrition = await readThroughCache({
      isOnline: () => services.network.isOnline(),
      load: () => services.api.getNutrition(date),
      save: (fresh) => services.planCache.saveNutrition(date, fresh),
      cached: () => services.planCache.readNutrition(date),
    });
    const meals = mergeLocalMeals(nutrition, await services.mealLogs.list());
    return mergeLocalWater(meals, await services.waterLog.list());
  },
});
