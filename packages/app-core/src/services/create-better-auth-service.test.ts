import { describe, expect, it } from 'vitest';
import { TOKEN_EXPIRY_MARGIN_MS } from '../config.ts';
import { AuthErrorCode } from '../enums/auth-error-code.ts';
import { AuthError } from '../errors/auth-error.ts';
import { createBetterAuthService } from './create-better-auth-service.ts';

interface Call {
  url: string;
  method: string | undefined;
  credentials: RequestCredentials | undefined;
  body: unknown;
}

function setup(respond: () => Response | Promise<Response> = () => Response.json({})) {
  const calls: Call[] = [];
  const fetchStub = (async (input: URL | RequestInfo, init?: RequestInit) => {
    calls.push({
      url: String(input),
      method: init?.method,
      credentials: init?.credentials,
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
    });
    return respond();
  }) as typeof fetch;
  return { calls, auth: createBetterAuthService({ authUrl: '/auth/', fetch: fetchStub }) };
}

const authError = (code: AuthErrorCode) => expect.objectContaining({ code });

describe('createBetterAuthService request shapes', () => {
  it('requests a sign-in code', async () => {
    const { auth, calls } = setup();

    await auth.requestEmailCode('ada@example.com');

    expect(calls).toEqual([
      {
        url: '/auth/email-otp/send-verification-otp',
        method: 'POST',
        credentials: 'include',
        body: { email: 'ada@example.com', type: 'sign-in' },
      },
    ]);
  });

  it('verifies a code with the cookie-carrying sign-in call', async () => {
    const { auth, calls } = setup(() => Response.json({ token: 't', user: { id: 'u' } }));

    await auth.verifyEmailCode('ada@example.com', '123456');

    expect(calls).toEqual([
      {
        url: '/auth/sign-in/email-otp',
        method: 'POST',
        credentials: 'include',
        body: { email: 'ada@example.com', otp: '123456' },
      },
    ]);
  });

  it('starts Google sign-in and returns the provider URL', async () => {
    const { auth, calls } = setup(() =>
      Response.json({ url: 'https://google.example/x', redirect: true }),
    );

    expect(await auth.startGoogleSignIn('https://app.example/')).toEqual({
      redirectUrl: 'https://google.example/x',
    });
    expect(calls[0]).toMatchObject({
      url: '/auth/sign-in/social',
      method: 'POST',
      credentials: 'include',
      body: { provider: 'google', callbackURL: 'https://app.example/' },
    });
  });

  it('reads the API token with a cookie-authenticated GET, and returns undefined when signed out', async () => {
    const signedIn = setup(() => Response.json({ token: 'jwt-1' }));
    expect(await signedIn.auth.getToken()).toBe('jwt-1');
    expect(signedIn.calls[0]).toMatchObject({
      url: '/auth/token',
      method: 'GET',
      credentials: 'include',
    });

    const signedOut = setup(() => Response.json({ code: 'UNAUTHORIZED' }, { status: 401 }));
    expect(await signedOut.auth.getToken()).toBeUndefined();
  });

  it('reads the session user id, or undefined for a null session', async () => {
    const live = setup(() => Response.json({ session: {}, user: { id: 'user-1' } }));
    expect(await live.auth.getSession()).toEqual({ userId: 'user-1' });
    expect(live.calls[0]).toMatchObject({ url: '/auth/get-session', method: 'GET' });

    const none = setup(() => Response.json(null));
    expect(await none.auth.getSession()).toBeUndefined();
  });

  it('signs out with a JSON body', async () => {
    const { auth, calls } = setup();

    await auth.signOut();

    expect(calls[0]).toMatchObject({ url: '/auth/sign-out', method: 'POST', body: {} });
  });
});

describe('createBetterAuthService error mapping', () => {
  it.each([
    ['INVALID_OTP', AuthErrorCode.InvalidCode],
    ['OTP_EXPIRED', AuthErrorCode.CodeExpired],
    ['TOO_MANY_ATTEMPTS', AuthErrorCode.TooManyAttempts],
    ['SOMETHING_NEW', AuthErrorCode.Unknown],
  ])('maps the Better Auth code %s to %s', async (code, expected) => {
    const { auth } = setup(() => Response.json({ code, message: 'x' }, { status: 400 }));

    const error = await auth.verifyEmailCode('ada@example.com', '123456').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AuthError);
    expect(error).toEqual(authError(expected));
  });

  it('maps a non-JSON error body to Unknown', async () => {
    const { auth } = setup(() => new Response('<html>', { status: 502 }));

    await expect(auth.requestEmailCode('ada@example.com')).rejects.toEqual(
      authError(AuthErrorCode.Unknown),
    );
  });

  it('maps a rejected fetch to Network', async () => {
    const auth = createBetterAuthService({
      authUrl: '/auth',
      fetch: (async () => {
        throw new TypeError('Failed to fetch');
      }) as typeof fetch,
    });

    await expect(auth.getToken()).rejects.toEqual(authError(AuthErrorCode.Network));
    await expect(auth.signOut()).rejects.toEqual(authError(AuthErrorCode.Network));
  });

  it('maps a success body that does not match to Unknown', async () => {
    const { auth } = setup(() => Response.json({ nope: true }));

    await expect(auth.getToken()).rejects.toEqual(authError(AuthErrorCode.Unknown));
    await expect(auth.startGoogleSignIn('https://app.example/')).rejects.toEqual(
      authError(AuthErrorCode.Unknown),
    );
  });
});

describe('createBetterAuthService token cache', () => {
  const NOW = 1_700_000_000_000;
  const LIFETIME_MS = 15 * 60 * 1000;

  function jwt(expiresAtMs: number | undefined): string {
    const payload = expiresAtMs === undefined ? {} : { exp: expiresAtMs / 1000 };
    return `header.${btoa(JSON.stringify(payload)).replace(/=+$/, '')}.signature`;
  }

  function setupCache(responses: (() => Response)[]) {
    let time = NOW;
    const queue = [...responses];
    const fetched: string[] = [];
    const fetchStub = (async (input: URL | RequestInfo) => {
      fetched.push(String(input));
      await Promise.resolve();
      const next = queue.shift();
      if (!next) throw new Error('unexpected fetch');
      return next();
    }) as typeof fetch;
    const auth = createBetterAuthService({ authUrl: '/auth', fetch: fetchStub, now: () => time });
    const tokenFetches = () => fetched.filter((url) => url.endsWith('/token')).length;
    return { auth, tokenFetches, advance: (ms: number) => (time += ms) };
  }

  const tokenResponse = (token: string) => () => Response.json({ token });
  const ok = () => Response.json({});

  it('serves the second call from the cache without fetching', async () => {
    const token = jwt(NOW + LIFETIME_MS);
    const { auth, tokenFetches, advance } = setupCache([tokenResponse(token)]);

    expect(await auth.getToken()).toBe(token);
    advance(LIFETIME_MS - TOKEN_EXPIRY_MARGIN_MS - 1);

    expect(await auth.getToken()).toBe(token);
    expect(tokenFetches()).toBe(1);
  });

  it('fetches again from 30 s before expiry', async () => {
    const first = jwt(NOW + LIFETIME_MS);
    const second = jwt(NOW + 2 * LIFETIME_MS);
    const { auth, tokenFetches, advance } = setupCache([
      tokenResponse(first),
      tokenResponse(second),
    ]);
    await auth.getToken();

    advance(LIFETIME_MS - TOKEN_EXPIRY_MARGIN_MS);

    expect(await auth.getToken()).toBe(second);
    expect(tokenFetches()).toBe(2);
  });

  it.each([
    ['has no exp claim', jwt(undefined)],
    ['is not a JWT', 'opaque-token'],
    ['has an undecodable payload', 'header.%%%.signature'],
  ])('does not cache a token that %s', async (_name, token) => {
    const { auth, tokenFetches } = setupCache([tokenResponse(token), tokenResponse(token)]);

    await auth.getToken();
    await auth.getToken();

    expect(tokenFetches()).toBe(2);
  });

  it('drops the cached token on signOut', async () => {
    const token = jwt(NOW + LIFETIME_MS);
    const { auth, tokenFetches } = setupCache([
      tokenResponse(token),
      ok,
      () => Response.json({}, { status: 401 }),
    ]);
    await auth.getToken();

    await auth.signOut();

    expect(await auth.getToken()).toBeUndefined();
    expect(tokenFetches()).toBe(2);
  });

  it('drops the cached token on verifyEmailCode', async () => {
    const old = jwt(NOW + LIFETIME_MS);
    const fresh = jwt(NOW + 2 * LIFETIME_MS);
    const { auth } = setupCache([tokenResponse(old), ok, tokenResponse(fresh)]);
    await auth.getToken();

    await auth.verifyEmailCode('ada@example.com', '123456');

    expect(await auth.getToken()).toBe(fresh);
  });

  it('shares one request between concurrent calls', async () => {
    const token = jwt(NOW + LIFETIME_MS);
    const { auth, tokenFetches } = setupCache([tokenResponse(token)]);

    const tokens = await Promise.all([auth.getToken(), auth.getToken(), auth.getToken()]);

    expect(tokens).toEqual([token, token, token]);
    expect(tokenFetches()).toBe(1);
  });

  it('does not cache a non-2xx answer and forgets the earlier token', async () => {
    const token = jwt(NOW + LIFETIME_MS);
    const { auth, tokenFetches, advance } = setupCache([
      tokenResponse(token),
      () => Response.json({ code: 'SERVER' }, { status: 500 }),
      () => Response.json({}, { status: 401 }),
    ]);
    await auth.getToken();
    advance(LIFETIME_MS - TOKEN_EXPIRY_MARGIN_MS);

    await expect(auth.getToken()).rejects.toEqual(authError(AuthErrorCode.Unknown));
    expect(await auth.getToken()).toBeUndefined();
    expect(tokenFetches()).toBe(3);
  });

  it('does not cache a token fetched while a sign-out was in flight', async () => {
    const stale = jwt(NOW + LIFETIME_MS);
    const { auth, tokenFetches } = setupCache([
      tokenResponse(stale),
      ok,
      () => Response.json({}, { status: 401 }),
    ]);
    const pending = auth.getToken();
    await auth.signOut();
    await pending;

    expect(await auth.getToken()).toBeUndefined();
    expect(tokenFetches()).toBe(2);
  });
});
