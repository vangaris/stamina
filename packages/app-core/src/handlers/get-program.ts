import { z } from 'zod';
import { defineRequest } from '../define-request.ts';
import { OfflinePolicy } from '../enums/offline-policy.ts';
import { RequestType } from '../enums/request-type.ts';
import type { GetProgram, Services, Stores } from '../types.ts';

export const getProgram = (): GetProgram => ({ type: RequestType.GetProgram });

/** The first week of the person's Program, or null before one is created. Never logged. */
export const getProgramDefinition = defineRequest<GetProgram, Services, Stores>({
  schema: z.object({ type: z.literal(RequestType.GetProgram) }),
  offline: OfflinePolicy.Never,
  handler: (_request, { services }) => services.api.getProgram(),
});
