import type { z } from 'zod';
import type { healthResponseSchema } from './health-response-schema.ts';
import type { meResponseSchema } from './me-response-schema.ts';

export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type MeResponse = z.infer<typeof meResponseSchema>;

export interface ApiClientOptions {
  baseUrl: string;
  fetch?: typeof fetch;
  /** Called before each authenticated request; a returned token is sent as `Authorization: Bearer`. */
  getToken?: () => Promise<string | undefined>;
}

/**
 * Typed client: every response is validated at runtime before it reaches a caller.
 * Authenticated calls throw `ApiError` on a non-2xx answer.
 */
export interface ApiClient {
  health(): Promise<HealthResponse>;
  me(): Promise<MeResponse>;
}
