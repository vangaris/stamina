import { z } from 'zod';

/** `GET /health`: 200 when the database answers, 503 with `degraded` when it does not. */
export const healthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  database: z.enum(['up', 'down']),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
