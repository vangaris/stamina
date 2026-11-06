import { finishSessionSchema, type FinishSession } from '@stamina/contracts';
import { z } from 'zod';
import { defineRequest } from '../define-request.ts';
import { OfflinePolicy } from '../enums/offline-policy.ts';
import { RequestType } from '../enums/request-type.ts';
import type { FinishSessionRequest, Services, Stores } from '../types.ts';

/** `finish.id` comes from `newId()`; `minutes` defaults to the Session's planned minutes. */
export const finishSession = (sessionId: string, finish: FinishSession): FinishSessionRequest => ({
  type: RequestType.FinishSession,
  sessionId,
  finish,
});

/**
 * Records the finish on the device first (the Session then reads as finished, with its Load),
 * then sends it; offline it waits in the offline queue and resolves `QUEUED_RESULT`. A second
 * finish is ignored by the server and returns the stored one. Never logged.
 */
export const finishSessionDefinition = defineRequest<FinishSessionRequest, Services, Stores>({
  schema: z.object({
    type: z.literal(RequestType.FinishSession),
    sessionId: z.uuid(),
    finish: finishSessionSchema,
  }),
  offline: OfflinePolicy.Queue,
  writeLocal: ({ sessionId, finish }, services) =>
    services.sessionLog.recordFinish(sessionId, { finish, recordedAt: new Date().toISOString() }),
  handler: ({ sessionId, finish }, { services }) => services.api.finishSession(sessionId, finish),
});
