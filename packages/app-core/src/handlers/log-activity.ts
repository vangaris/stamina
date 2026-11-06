import { logActivitySchema, RecordStatus, type LogActivity } from '@stamina/contracts';
import { z } from 'zod';
import { defineRequest } from '../define-request.ts';
import { OfflinePolicy } from '../enums/offline-policy.ts';
import { RequestType } from '../enums/request-type.ts';
import type { LogActivityRequest, Services, Stores } from '../types.ts';

/** `activity.id` comes from `newId()`, made once when the person taps Save, so a resend is recognised. */
export const logActivity = (activity: LogActivity): LogActivityRequest => ({
  type: RequestType.LogActivity,
  activity,
});

/**
 * Writes the Activity on the device first, then sends it; offline (or when the network drops
 * mid-send) it waits in the offline queue and resolves `QUEUED_RESULT`. A `Rejected` answer is a
 * result, not an error, and drops the Activity from the device, as does a permanent client error
 * (`undoLocal`). Never logged: sport, minutes and intensity are health data.
 */
export const logActivityDefinition = defineRequest<LogActivityRequest, Services, Stores>({
  schema: z.object({
    type: z.literal(RequestType.LogActivity),
    activity: logActivitySchema,
  }),
  offline: OfflinePolicy.Queue,
  writeLocal: ({ activity }, services) =>
    services.activityLog.add(activity, services.clock.wallTime().toISOString()),
  undoLocal: ({ activity }, services) => services.activityLog.remove(activity.id),
  handler: async ({ activity }, { services }) => {
    const result = await services.api.logActivity(activity);
    if (result.status === RecordStatus.Rejected) await services.activityLog.remove(activity.id);
    return result;
  },
});
