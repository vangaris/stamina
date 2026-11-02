import { z } from 'zod';
import { defineRequest } from '../define-request.ts';
import { OfflinePolicy } from '../enums/offline-policy.ts';
import { RequestType } from '../enums/request-type.ts';
import type { RecordDoctorOk, Services, Stores } from '../types.ts';

export const recordDoctorOk = (): RecordDoctorOk => ({ type: RequestType.RecordDoctorOk });

/**
 * Records "a doctor has said I can train" after a referral (Limited mode). No Screening, a
 * cleared one and pregnancy come back as a `Rejected` result.
 */
export const recordDoctorOkDefinition = defineRequest<RecordDoctorOk, Services, Stores>({
  schema: z.object({ type: z.literal(RequestType.RecordDoctorOk) }),
  offline: OfflinePolicy.Never,
  handler: (_request, { services }) => services.api.recordDoctorOk(),
});
