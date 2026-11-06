import { confirmDoctorSeenSchema } from '@stamina/contracts';
import type { StopFlag } from '@stamina/domain';
import { z } from 'zod';
import { defineRequest } from '../define-request.ts';
import { AppErrorCode } from '../enums/app-error-code.ts';
import { OfflinePolicy } from '../enums/offline-policy.ts';
import { RequestType } from '../enums/request-type.ts';
import { AppError } from '../errors/app-error.ts';
import type { ConfirmDoctorSeenRequest, Services, Stores } from '../types.ts';

/** `flags`: the pausing kinds the person saw on the Paused screen. */
export const confirmDoctorSeen = (flags: readonly StopFlag[]): ConfirmDoctorSeenRequest => ({
  type: RequestType.ConfirmDoctorSeen,
  flags,
});

/**
 * "A doctor has seen me": ends the open pauses of the kinds the person saw; a kind reported
 * later (say from another device) stays. A flag still waiting in the offline queue would
 * be sent after the confirmation and pause the person again, so the queue is replayed first
 * (best effort) and, with a stop flag still waiting, nothing happens and it rejects
 * `AppErrorCode.UnsyncedData`. Afterwards the cached stop state takes the server's answer and
 * the flags of the confirmed kinds kept on the device go (a refused one was already taken back).
 * Never logged.
 */
export const confirmDoctorSeenDefinition = defineRequest<
  ConfirmDoctorSeenRequest,
  Services,
  Stores
>({
  schema: z.object({
    type: z.literal(RequestType.ConfirmDoctorSeen),
    flags: confirmDoctorSeenSchema.shape.flags,
  }),
  offline: OfflinePolicy.Never,
  handler: async ({ flags }, { services, sync }) => {
    await sync().catch(() => undefined);
    const waiting = (await services.offlineQueue.pending()).some(
      ({ request }) => request.type === RequestType.ReportStopFlag,
    );
    if (waiting) throw new AppError(AppErrorCode.UnsyncedData);
    const result = await services.api.confirmDoctorSeen({ flags: [...flags] });
    await services.planCache.saveStop(result.stop);
    for (const { report } of await services.stopFlags.list()) {
      if (flags.includes(report.flag)) await services.stopFlags.remove(report.id);
    }
    return result;
  },
});
