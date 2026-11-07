import { logWaterSchema, type LogWater } from '@stamina/contracts';
import { z } from 'zod';
import { defineRequest } from '../define-request.ts';
import { OfflinePolicy } from '../enums/offline-policy.ts';
import { RequestType } from '../enums/request-type.ts';
import type { LogWaterRequest, Services, Stores } from '../types.ts';

/** `water.id` comes from `newId()`, made once when the person taps +250 or +500, so a resend is recognised. */
export const logWater = (water: LogWater): LogWaterRequest => ({
  type: RequestType.LogWater,
  water,
});

/**
 * Writes the log on the device first, so the water bar counts it at once (`getNutrition` adds
 * the local logs), then sends it; offline (or when the network drops mid-send) it waits in the
 * offline queue and resolves `QUEUED_RESULT`. Once the server has it the local row goes: the
 * server's day total includes it now, and a row left behind would count twice. A permanent
 * client error takes the log back (`undoLocal`). Never logged: water is health data.
 */
export const logWaterDefinition = defineRequest<LogWaterRequest, Services, Stores>({
  schema: z.object({
    type: z.literal(RequestType.LogWater),
    water: logWaterSchema,
  }),
  offline: OfflinePolicy.Queue,
  writeLocal: ({ water }, services) =>
    services.waterLog.add(water, services.clock.wallTime().toISOString()),
  undoLocal: ({ water }, services) => services.waterLog.remove(water.id),
  handler: async ({ water }, { services }) => {
    const result = await services.api.logWater(water);
    await services.waterLog.remove(water.id);
    return result;
  },
});
