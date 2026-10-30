import type { z } from 'zod';
import type { healthResponseSchema } from './health-response-schema.ts';

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export interface ApiClientOptions {
  baseUrl: string;
  fetch?: typeof fetch;
}

/** Typed client: every response is validated at runtime before it reaches a caller. */
export interface ApiClient {
  health(): Promise<HealthResponse>;
}
