/**
 * Seam 3 fake of Neon Auth (managed Better Auth): the subset of its REST API that sign-in uses,
 * served under `/auth` exactly like Neon's `base_url`. The browser reaches it through the web
 * origin's `/auth` proxy and the API fetches its JWKS directly. Run on its own:
 *
 *   tsx e2e/support/fake-better-auth.ts          (PORT, TRUSTED_ORIGINS in the environment)
 */
import { createHash, randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { pathToFileURL } from 'node:url';
import { calculateJwkThumbprint, exportJWK, generateKeyPair, SignJWT, type JWK } from 'jose';

/** The code every fake mailbox "receives". */
export const FAKE_OTP = '424242';
/** The third wrong guess invalidates the code, like Better Auth's `allowedAttempts: 3`. */
export const MAX_ATTEMPTS = 3;
export const SESSION_COOKIE = 'fake-auth.session';
const AUTH_PREFIX = '/auth';
const TOKEN_LIFETIME = '15m';
const ROLE = 'authenticated';

export interface FakeBetterAuthOptions {
  /** Origin the server is reachable at; becomes the JWT issuer. */
  origin: string;
  /** When set, POSTs need an `Origin` in this list (Better Auth's trusted-origin check). */
  trustedOrigins?: readonly string[];
}

/** Deterministic uuid for an email, so the same person gets the same user id across sign-ins. */
export function uuidFromEmail(email: string): string {
  const hex = createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `5${hex.slice(13, 16)}`,
    `${'89ab'[Number.parseInt(hex[16]!, 16) % 4]}${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join('-');
}

export async function createFakeBetterAuth({
  origin,
  trustedOrigins,
}: FakeBetterAuthOptions): Promise<Server> {
  const { publicKey, privateKey } = await generateKeyPair('EdDSA', { extractable: true });
  const publicJwk: JWK = await exportJWK(publicKey);
  const kid = await calculateJwkThumbprint(publicJwk);
  const jwks = { keys: [{ ...publicJwk, kid, alg: 'EdDSA', use: 'sig' }] };

  const codes = new Map<string, { attempts: number }>();
  const sessions = new Map<string, string>();

  const sendJson = (res: ServerResponse, status: number, body: unknown, headers = {}) => {
    res.writeHead(status, { 'content-type': 'application/json', ...headers });
    res.end(JSON.stringify(body));
  };
  const fail = (res: ServerResponse, status: number, code: string) =>
    sendJson(res, status, { code, message: code });

  const readJson = async (req: IncomingMessage): Promise<Record<string, unknown>> => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const text = Buffer.concat(chunks).toString('utf8');
    return text ? (JSON.parse(text) as Record<string, unknown>) : {};
  };

  const sessionEmail = (req: IncomingMessage): string | undefined => {
    const cookie = req.headers.cookie ?? '';
    const match = cookie.split(/;\s*/).find((part) => part.startsWith(`${SESSION_COOKIE}=`));
    return match ? sessions.get(match.slice(SESSION_COOKIE.length + 1)) : undefined;
  };

  const user = (email: string) => ({ id: uuidFromEmail(email), email, emailVerified: true });

  const signToken = (email: string) =>
    new SignJWT({ email, role: ROLE })
      .setProtectedHeader({ alg: 'EdDSA', kid })
      .setIssuer(origin)
      .setSubject(uuidFromEmail(email))
      .setIssuedAt()
      .setExpirationTime(TOKEN_LIFETIME)
      .sign(privateKey);

  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', origin);
      if (!url.pathname.startsWith(`${AUTH_PREFIX}/`)) return fail(res, 404, 'NOT_FOUND');
      const route = `${req.method} ${url.pathname.slice(AUTH_PREFIX.length)}`;

      if (
        req.method === 'POST' &&
        trustedOrigins &&
        !trustedOrigins.includes(req.headers.origin ?? '')
      ) {
        return fail(res, 403, 'INVALID_ORIGIN');
      }

      switch (route) {
        case 'POST /email-otp/send-verification-otp': {
          const { email } = await readJson(req);
          if (typeof email !== 'string' || !email.includes('@'))
            return fail(res, 400, 'INVALID_EMAIL');
          codes.set(email.toLowerCase(), { attempts: 0 });
          return sendJson(res, 200, { success: true });
        }
        case 'POST /sign-in/email-otp': {
          const { email, otp } = await readJson(req);
          if (typeof email !== 'string' || typeof otp !== 'string')
            return fail(res, 400, 'INVALID_OTP');
          const key = email.toLowerCase();
          const pending = codes.get(key);
          if (!pending) return fail(res, 400, 'INVALID_OTP');
          if (otp !== FAKE_OTP) {
            pending.attempts += 1;
            if (pending.attempts >= MAX_ATTEMPTS) {
              codes.delete(key);
              return fail(res, 403, 'TOO_MANY_ATTEMPTS');
            }
            return fail(res, 400, 'INVALID_OTP');
          }
          codes.delete(key);
          const sessionId = randomUUID();
          sessions.set(sessionId, key);
          return sendJson(
            res,
            200,
            { token: sessionId, user: user(key) },
            { 'set-cookie': `${SESSION_COOKIE}=${sessionId}; HttpOnly; Path=/; SameSite=Lax` },
          );
        }
        case 'GET /token': {
          const email = sessionEmail(req);
          if (!email) return fail(res, 401, 'UNAUTHORIZED');
          return sendJson(res, 200, { token: await signToken(email) });
        }
        case 'GET /.well-known/jwks.json':
          return sendJson(res, 200, jwks);
        case 'GET /get-session': {
          const email = sessionEmail(req);
          return sendJson(
            res,
            200,
            email ? { session: { userId: uuidFromEmail(email) }, user: user(email) } : null,
          );
        }
        case 'POST /sign-out': {
          const cookie = req.headers.cookie ?? '';
          const match = cookie.split(/;\s*/).find((part) => part.startsWith(`${SESSION_COOKIE}=`));
          if (match) sessions.delete(match.slice(SESSION_COOKIE.length + 1));
          return sendJson(
            res,
            200,
            { success: true },
            { 'set-cookie': `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0` },
          );
        }
        case 'POST /sign-in/social': {
          const { callbackURL } = await readJson(req);
          return sendJson(res, 200, { url: callbackURL, redirect: true });
        }
        default:
          return fail(res, 404, 'NOT_FOUND');
      }
    } catch {
      fail(res, 500, 'FAKE_AUTH_ERROR');
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 8789);
  const origin = `http://127.0.0.1:${port}`;
  const trusted = process.env.TRUSTED_ORIGINS?.split(',').filter(Boolean);
  const server = await createFakeBetterAuth({
    origin,
    ...(trusted ? { trustedOrigins: trusted } : {}),
  });
  server.listen(port, '127.0.0.1', () => console.log(`fake Better Auth on ${origin}/auth`));
}
