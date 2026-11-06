import { z } from 'zod';
import { defineRequest } from '../define-request.ts';
import { AppErrorCode } from '../enums/app-error-code.ts';
import { OfflinePolicy } from '../enums/offline-policy.ts';
import { RequestType } from '../enums/request-type.ts';
import { AppError } from '../errors/app-error.ts';
import type { ConfirmDoctorSeen, Services, Stores } from '../types.ts';

export const confirmDoctorSeen = (): ConfirmDoctorSeen => ({
  type: RequestType.ConfirmDoctorSeen,
});

/**
 * "A doctor has seen me": ends every open pause. A flag still waiting in the offline queue would
 * be sent after the confirmation and pause the person again, so the queue is replayed first
 * (best effort) and, with a stop flag still waiting, nothing happens and it rejects
 * `AppErrorCode.UnsyncedData`. Afterwards the cached stop state takes the server's answer and
 * the flags kept on the device go (a refused one was already taken back). Never logged.
 */
export const confirmDoctorSeenDefinition = defineRequest<ConfirmDoctorSeen, Services, Stores>({
  schema: z.object({ type: z.literal(RequestType.ConfirmDoctorSeen) }),
  offline: OfflinePolicy.Never,
  handler: async (_request, { services, sync }) => {
    await sync().catch(() => undefined);
    const waiting = (await services.offlineQueue.pending()).some(
      ({ request }) => request.type === RequestType.ReportStopFlag,
    );
    if (waiting) throw new AppError(AppErrorCode.UnsyncedData);
    const result = await services.api.confirmDoctorSeen();
    await services.planCache.saveStop(result.stop);
    for (const { report } of await services.stopFlags.list()) {
      await services.stopFlags.remove(report.id);
    }
    return result;
  },
});
