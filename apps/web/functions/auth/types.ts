export interface AuthProxyOptions {
  /** Neon Auth's base URL, ending in `/auth` (`NEON_AUTH_BASE_URL`). */
  authBaseUrl: string;
  fetch?: typeof fetch;
}

export type AuthProxy = (request: Request) => Promise<Response>;
