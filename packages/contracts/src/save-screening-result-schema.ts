import { z } from 'zod';
import { RecordStatus } from './enums/record-status.ts';
import { ScreeningRejection } from './enums/screening-rejection.ts';
import { savedScreeningSchema } from './saved-screening-schema.ts';

/** `POST /screening` answers `200` with `Saved` or `422` with `Rejected`. */
export const saveScreeningResultSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal(RecordStatus.Saved),
    screening: savedScreeningSchema,
    /** The body-composition Goal was switched to General fitness because Nutrition is now off. */
    goalChanged: z.boolean(),
  }),
  z.object({ status: z.literal(RecordStatus.Rejected), reason: z.enum(ScreeningRejection) }),
]);
