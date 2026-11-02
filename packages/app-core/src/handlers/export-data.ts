import { z } from 'zod';
import { defineRequest } from '../define-request.ts';
import { OfflinePolicy } from '../enums/offline-policy.ts';
import { RequestType } from '../enums/request-type.ts';
import type { ExportData, Services, Stores } from '../types.ts';

export const exportData = (): ExportData => ({ type: RequestType.ExportData });

/** Everything Stamina holds about the person, for them to keep. Never logged. */
export const exportDataDefinition = defineRequest<ExportData, Services, Stores>({
  schema: z.object({ type: z.literal(RequestType.ExportData) }),
  offline: OfflinePolicy.Never,
  handler: (_request, { services }) => services.api.exportData(),
});
