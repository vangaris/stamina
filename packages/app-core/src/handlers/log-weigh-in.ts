import { logWeighInSchema, type LogWeighIn } from '@stamina/contracts';
import { z } from 'zod';
import { defineRequest } from '../define-request.ts';
import { OfflinePolicy } from '../enums/offline-policy.ts';
import { RequestType } from '../enums/request-type.ts';
import type { LogWeighInRequest, Services, Stores } from '../types.ts';

/** `weighIn.weightKg` is kilograms whatever units the person reads on the screen. */
export const logWeighIn = (weighIn: LogWeighIn): LogWeighInRequest => ({
  type: RequestType.LogWeighIn,
  weighIn,
});

/**
 * Stores one weigh-in. Online only: offline it rejects `AppErrorCode.Offline` and nothing is
 * kept, so the person tries again with signal. A weight outside the accepted range is rejected
 * by the schema before anything is sent. Never logged: a weight is health data.
 */
export const logWeighInDefinition = defineRequest<LogWeighInRequest, Services, Stores>({
  schema: z.object({
    type: z.literal(RequestType.LogWeighIn),
    weighIn: logWeighInSchema,
  }),
  offline: OfflinePolicy.Never,
  handler: ({ weighIn }, { services }) => services.api.logWeighIn(weighIn),
});
