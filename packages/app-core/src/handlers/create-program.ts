import { z } from 'zod';
import { defineRequest } from '../define-request.ts';
import { OfflinePolicy } from '../enums/offline-policy.ts';
import { RequestType } from '../enums/request-type.ts';
import type { CreateProgram, Services, Stores } from '../types.ts';

export const createProgram = (): CreateProgram => ({ type: RequestType.CreateProgram });

/**
 * Asks the server to create the Program (a repeat returns the stored one). A refusal is a
 * `Rejected` result with its reason, not an error. Never logged.
 */
export const createProgramDefinition = defineRequest<CreateProgram, Services, Stores>({
  schema: z.object({ type: z.literal(RequestType.CreateProgram) }),
  offline: OfflinePolicy.Never,
  handler: (_request, { services }) => services.api.createProgram(),
});
