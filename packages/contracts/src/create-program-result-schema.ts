import { z } from 'zod';
import { ProgramRejection } from './enums/program-rejection.ts';
import { RecordStatus } from './enums/record-status.ts';
import { programWeekSchema } from './program-schema.ts';

/**
 * `POST /program` answers `200` with `Saved` (the first week; a repeat returns the stored one) or
 * `422` with `Rejected`.
 */
export const createProgramResultSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal(RecordStatus.Saved), program: programWeekSchema }),
  z.object({ status: z.literal(RecordStatus.Rejected), reason: z.enum(ProgramRejection) }),
]);
