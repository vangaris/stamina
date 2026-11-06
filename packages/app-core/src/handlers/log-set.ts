import { logSetSchema, RecordStatus, type LogSet } from '@stamina/contracts';
import { z } from 'zod';
import { defineRequest } from '../define-request.ts';
import { OfflinePolicy } from '../enums/offline-policy.ts';
import { RequestType } from '../enums/request-type.ts';
import type { LogSetRequest, Services, Stores } from '../types.ts';

/** `set.id` comes from `newId()`, made once when the person taps Done, so a resend is recognised. */
export const logSet = (sessionId: string, set: LogSet): LogSetRequest => ({
  type: RequestType.LogSet,
  sessionId,
  set,
});

/**
 * Writes the set on the device first, then sends it; offline (or when the network drops mid-send)
 * it waits in the offline queue and resolves `QUEUED_RESULT`. A `Rejected` answer is a result, not
 * an error, and drops the set from the device. Never logged: weight, reps and RPE are health data.
 */
export const logSetDefinition = defineRequest<LogSetRequest, Services, Stores>({
  schema: z.object({
    type: z.literal(RequestType.LogSet),
    sessionId: z.uuid(),
    set: logSetSchema,
  }),
  offline: OfflinePolicy.Queue,
  writeLocal: ({ sessionId, set }, services) => services.sessionLog.addSet(sessionId, set),
  handler: async ({ sessionId, set }, { services }) => {
    const result = await services.api.logSet(sessionId, set);
    if (result.status === RecordStatus.Rejected) await services.sessionLog.removeSet(set.id);
    return result;
  },
});
