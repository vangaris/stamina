import { z } from 'zod';
import { DatabaseStatus } from './enums/database-status.ts';
import { HealthStatus } from './enums/health-status.ts';

/** `GET /health`: 200 when the database answers, 503 with `degraded` when it does not. */
export const healthResponseSchema = z.object({
  status: z.enum(HealthStatus),
  database: z.enum(DatabaseStatus),
});
