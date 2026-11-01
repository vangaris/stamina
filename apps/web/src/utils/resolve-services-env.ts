import { ServicesMode, type ServicesEnv } from '@stamina/app-core';
import { AUTH_PATH } from '../config.ts';
import type { ServicesEnvInput } from '../types.ts';

/**
 * Picks the services the app runs on. `dev` is fully in-memory (UI work without Neon). Otherwise
 * the real services: the API at `apiUrl` and Neon Auth through this origin's `/auth` proxy, so
 * the session cookie is first-party.
 */
export function resolveServicesEnv({ mode, apiUrl, origin }: ServicesEnvInput): ServicesEnv {
  if (mode === ServicesMode.Dev) return { mode: ServicesMode.Dev };
  // A production build without the API URL must fail loudly, not call localhost.
  if (!apiUrl) throw new Error('VITE_API_URL was not set when this app was built');
  return { mode: ServicesMode.Production, apiBaseUrl: apiUrl, authUrl: `${origin}${AUTH_PATH}` };
}
