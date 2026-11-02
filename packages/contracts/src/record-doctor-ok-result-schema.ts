import { z } from 'zod';
import { DoctorOkRejection } from './enums/doctor-ok-rejection.ts';
import { RecordStatus } from './enums/record-status.ts';
import { savedScreeningSchema } from './saved-screening-schema.ts';

/** `POST /screening/doctor-ok` answers `200` with `Saved` or `422` with `Rejected`. */
export const recordDoctorOkResultSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal(RecordStatus.Saved), screening: savedScreeningSchema }),
  z.object({ status: z.literal(RecordStatus.Rejected), reason: z.enum(DoctorOkRejection) }),
]);
