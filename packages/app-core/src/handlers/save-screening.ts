import { screeningSubmissionSchema } from '@stamina/contracts';
import { z } from 'zod';
import { defineRequest } from '../define-request.ts';
import { OfflinePolicy } from '../enums/offline-policy.ts';
import { RequestType } from '../enums/request-type.ts';
import type { SaveScreening, Services, Stores } from '../types.ts';

export const saveScreening = (submission: SaveScreening['submission']): SaveScreening => ({
  type: RequestType.SaveScreening,
  submission,
});

/**
 * Sends the answers; the server decides the outcome. Missing consent is a `Rejected` result, not
 * an error. A malformed submission (an answer missing, areas without the question) fails
 * validation before anything is sent. The answers are never logged.
 */
export const saveScreeningDefinition = defineRequest<SaveScreening, Services, Stores>({
  schema: z.object({
    type: z.literal(RequestType.SaveScreening),
    submission: screeningSubmissionSchema,
  }),
  offline: OfflinePolicy.Never,
  handler: ({ submission }, { services }) => services.api.saveScreening(submission),
});
