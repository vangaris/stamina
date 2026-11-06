import { reportStopFlagSchema, type ReportStopFlag } from '@stamina/contracts';
import { z } from 'zod';
import { defineRequest } from '../define-request.ts';
import { OfflinePolicy } from '../enums/offline-policy.ts';
import { RequestType } from '../enums/request-type.ts';
import type { ReportStopFlagRequest, Services, Stores } from '../types.ts';

/** `report.id` comes from `newId()`, made once when the person confirms the flag, so a resend is recognised. */
export const reportStopFlag = (report: ReportStopFlag): ReportStopFlagRequest => ({
  type: RequestType.ReportStopFlag,
  report,
});

/**
 * Writes the flag on the device first, so the pause holds at once (`getSafety` merges the local
 * flags), then sends it; offline (or when the network drops mid-send) it waits in the offline
 * queue and resolves `QUEUED_RESULT`. Once the server has it, the cached stop state takes the
 * server's answer (it now includes the flag) and the local row goes. A permanent client error
 * takes the flag back (`undoLocal`). Never logged: a stop flag is health data.
 */
export const reportStopFlagDefinition = defineRequest<ReportStopFlagRequest, Services, Stores>({
  schema: z.object({
    type: z.literal(RequestType.ReportStopFlag),
    report: reportStopFlagSchema,
  }),
  offline: OfflinePolicy.Queue,
  writeLocal: ({ report }, services) =>
    services.stopFlags.add(report, services.clock.wallTime().toISOString()),
  undoLocal: ({ report }, services) => services.stopFlags.remove(report.id),
  handler: async ({ report }, { services }) => {
    const result = await services.api.reportStopFlag(report);
    // Cache first: were the row removed first, a crash between the two would lose the pause offline.
    await services.planCache.saveStop(result.stop);
    await services.stopFlags.remove(report.id);
    return result;
  },
});
