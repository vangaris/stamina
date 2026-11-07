import { logMealSchema, type LogMeal } from '@stamina/contracts';
import { z } from 'zod';
import { defineRequest } from '../define-request.ts';
import { OfflinePolicy } from '../enums/offline-policy.ts';
import { RequestType } from '../enums/request-type.ts';
import type { LogMealRequest, Services, Stores } from '../types.ts';

/** `meal.id` comes from `newId()`, made once when the person taps Ate it, Something else or Skipped, so a resend is recognised. */
export const logMeal = (meal: LogMeal): LogMealRequest => ({
  type: RequestType.LogMeal,
  meal,
});

/**
 * Writes the log on the device first, so the slot shows its status at once (`getNutrition`
 * lays the local logs over the server's statuses), then sends it; offline (or when the network
 * drops mid-send) it waits in the offline queue and resolves `QUEUED_RESULT`. Once the server
 * has it the local row goes: the server's status includes it now. A permanent client error takes
 * the log back (`undoLocal`). Never logged: what a person ate is health data.
 */
export const logMealDefinition = defineRequest<LogMealRequest, Services, Stores>({
  schema: z.object({
    type: z.literal(RequestType.LogMeal),
    meal: logMealSchema,
  }),
  offline: OfflinePolicy.Queue,
  writeLocal: ({ meal }, services) =>
    services.mealLogs.add(meal, services.clock.wallTime().toISOString()),
  undoLocal: ({ meal }, services) => services.mealLogs.remove(meal.id),
  handler: async ({ meal }, { services }) => {
    const result = await services.api.logMeal(meal);
    await services.mealLogs.remove(meal.id);
    return result;
  },
});
