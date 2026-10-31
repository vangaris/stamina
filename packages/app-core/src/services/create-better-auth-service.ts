/**
 * The one module that talks to Neon Auth (managed Better Auth) over HTTP.
 *
 * UNVERIFIED against live Neon Auth: the paths, bodies and error codes below follow Better Auth's
 * Email OTP, JWT and social plugins as documented, and are exercised here only through a stub
 * `fetch`. If Neon differs, this is the only file to change.
 *
 * `authUrl` is the same-origin proxy (`/auth`) in the browser, so the session cookie is
 * first-party; requests send `credentials: 'include'`.
 */
import { z } from 'zod';
import {
  AUTH_ERROR_FOR_BETTER_AUTH_CODE,
  HTTP_UNAUTHORIZED,
  JSON_HEADERS,
  TOKEN_EXPIRY_MARGIN_MS,
} from '../config.ts';
import { AuthErrorCode } from '../enums/auth-error-code.ts';
import { AuthProvider } from '../enums/auth-provider.ts';
import { BetterAuthEndpoint } from '../enums/better-auth-endpoint.ts';
import { EmailCodeType } from '../enums/email-code-type.ts';
import { AuthError } from '../errors/auth-error.ts';
import type { AuthService } from '../types.ts';
import { readTokenExpiry } from '../utils/read-token-expiry.ts';

export interface BetterAuthServiceOptions {
  authUrl: string;
  fetch?: typeof fetch;
  /** Epoch milliseconds; compared with the token's `exp`. Tests inject it. */
  now?: () => number;
}

const errorBodySchema = z.object({ code: z.string() });
const tokenBodySchema = z.object({ token: z.string() });
const sessionBodySchema = z.object({ user: z.object({ id: z.string() }) }).nullable();
const socialBodySchema = z.object({ url: z.string() });

function authErrorCodeOf(code: string): AuthErrorCode {
  return (
    (AUTH_ERROR_FOR_BETTER_AUTH_CODE as Partial<Record<string, AuthErrorCode>>)[code] ??
    AuthErrorCode.Unknown
  );
}

export function createBetterAuthService({
  authUrl,
  fetch: fetchImpl = fetch,
  now = Date.now,
}: BetterAuthServiceOptions): AuthService {
  const base = authUrl.replace(/\/+$/, '');

  // The API token (15 min JWT) is cached until shortly before `exp`; concurrent calls share one
  // request. `generation` makes a response that was in flight during a sign-in or sign-out
  // uncacheable, so a token of the previous session is never stored.
  let cached: { token: string; refreshAt: number } | undefined;
  let inFlight: Promise<string | undefined> | undefined;
  let generation = 0;

  function dropToken(): void {
    generation += 1;
    cached = undefined;
    inFlight = undefined;
  }

  async function fetchToken(): Promise<string | undefined> {
    const startedIn = generation;
    const response = await send(BetterAuthEndpoint.Token, { method: 'GET' });
    if (!response.ok) {
      if (startedIn === generation) cached = undefined;
      if (response.status === HTTP_UNAUTHORIZED) return undefined;
      throw await failure(response);
    }
    const { token } = await parse(response, tokenBodySchema);
    const expiresAt = readTokenExpiry(token);
    if (startedIn === generation && expiresAt !== undefined) {
      cached = { token, refreshAt: expiresAt - TOKEN_EXPIRY_MARGIN_MS };
    }
    return token;
  }

  async function send(
    endpoint: BetterAuthEndpoint,
    init: { method: 'GET' } | { method: 'POST'; body: unknown },
  ): Promise<Response> {
    let response: Response;
    try {
      response = await fetchImpl(`${base}${endpoint}`, {
        method: init.method,
        credentials: 'include',
        ...(init.method === 'POST'
          ? { headers: JSON_HEADERS, body: JSON.stringify(init.body) }
          : {}),
      });
    } catch {
      throw new AuthError(AuthErrorCode.Network);
    }
    return response;
  }

  async function failure(response: Response): Promise<AuthError> {
    const body = errorBodySchema.safeParse(await response.json().catch(() => undefined));
    return new AuthError(body.success ? authErrorCodeOf(body.data.code) : AuthErrorCode.Unknown);
  }

  async function ok(response: Response): Promise<Response> {
    if (!response.ok) throw await failure(response);
    return response;
  }

  async function parse<T>(response: Response, schema: z.ZodType<T>): Promise<T> {
    const parsed = schema.safeParse(await response.json().catch(() => undefined));
    if (!parsed.success) throw new AuthError(AuthErrorCode.Unknown);
    return parsed.data;
  }

  return {
    async requestEmailCode(email) {
      await ok(
        await send(BetterAuthEndpoint.SendEmailCode, {
          method: 'POST',
          body: { email, type: EmailCodeType.SignIn },
        }),
      );
    },
    async verifyEmailCode(email, code) {
      // Success sets the session cookie; the `{ token, user }` body is not needed.
      dropToken();
      try {
        await ok(
          await send(BetterAuthEndpoint.VerifyEmailCode, {
            method: 'POST',
            body: { email, otp: code },
          }),
        );
      } finally {
        dropToken();
      }
    },
    async startGoogleSignIn(callbackUrl) {
      const response = await ok(
        await send(BetterAuthEndpoint.SocialSignIn, {
          method: 'POST',
          body: { provider: AuthProvider.Google, callbackURL: callbackUrl },
        }),
      );
      return { redirectUrl: (await parse(response, socialBodySchema)).url };
    },
    async getToken() {
      if (cached && now() < cached.refreshAt) return cached.token;
      if (inFlight) return inFlight;
      const request = fetchToken().finally(() => {
        if (inFlight === request) inFlight = undefined;
      });
      inFlight = request;
      return request;
    },
    async getSession() {
      const response = await ok(await send(BetterAuthEndpoint.Session, { method: 'GET' }));
      const body = await parse(response, sessionBodySchema);
      return body ? { userId: body.user.id } : undefined;
    },
    async signOut() {
      dropToken();
      try {
        await ok(await send(BetterAuthEndpoint.SignOut, { method: 'POST', body: {} }));
      } finally {
        dropToken();
      }
    },
  };
}
