import { ApiError } from '@stamina/contracts';
import { describe, expect, it } from 'vitest';
import {
  AppError,
  AppErrorCode,
  AuthError,
  AuthErrorCode,
  createServices,
  getSession,
  requestEmailCode,
  RequestOutcome,
  ServicesMode,
  SessionStatus,
  signOut,
  startGoogleSignIn,
  verifyEmailCode,
} from '../index.ts';
import { FAKE_AUTH } from '../config.ts';
import { setupMediator } from '../testing/setup-mediator.ts';

const EMAIL = 'ada@example.com';
const USER_ID = '0192f3a4-5b6c-7d8e-9f01-23456789abcd';

/** Counts `api.me()` calls and answers a fixed user. */
function countingApi() {
  const base = createServices({ mode: ServicesMode.Test }).api;
  const calls = { me: 0 };
  const api = {
    ...base,
    me: async () => {
      calls.me += 1;
      return { userId: USER_ID };
    },
  };
  return { api, calls };
}

describe('sign in with an emailed code through the mediator', () => {
  it('verifies the code, loads the user from the API once, then writes SignedIn', async () => {
    const { api, calls } = countingApi();
    const { mediator, sessionWrites } = setupMediator({ api });
    await mediator.send(requestEmailCode(EMAIL));

    const result = await mediator.send(verifyEmailCode(EMAIL, FAKE_AUTH.validCode));

    expect(result).toEqual({ status: SessionStatus.SignedIn, userId: USER_ID });
    expect(calls.me).toBe(1);
    expect(sessionWrites).toEqual([{ status: SessionStatus.SignedIn, userId: USER_ID }]);
  });

  it('uses the fake API end to end: the same email gets the same user id', async () => {
    const first = setupMediator();
    await first.mediator.send(verifyEmailCode(EMAIL, FAKE_AUTH.validCode));
    await first.mediator.send(signOut());
    await first.mediator.send(verifyEmailCode(EMAIL, FAKE_AUTH.validCode));

    const [signedIn, , again] = first.sessionWrites;
    expect(signedIn).toMatchObject({ status: SessionStatus.SignedIn });
    expect(again).toEqual(signedIn);
  });

  it('maps a wrong code to InvalidCode and writes nothing', async () => {
    const { api, calls } = countingApi();
    const { mediator, sessionWrites } = setupMediator({ api });

    await expect(mediator.send(verifyEmailCode(EMAIL, '000000'))).rejects.toMatchObject({
      code: AppErrorCode.InvalidCode,
    });
    expect(sessionWrites).toEqual([]);
    expect(calls.me).toBe(0);
  });

  it('maps the third wrong code to TooManyAttempts, even for a right code after it', async () => {
    const { mediator, sessionWrites } = setupMediator();
    const codes = [
      AppErrorCode.InvalidCode,
      AppErrorCode.InvalidCode,
      AppErrorCode.TooManyAttempts,
    ];
    for (const code of codes) {
      await expect(mediator.send(verifyEmailCode(EMAIL, '000000'))).rejects.toMatchObject({ code });
    }

    await expect(mediator.send(verifyEmailCode(EMAIL, FAKE_AUTH.validCode))).rejects.toMatchObject({
      code: AppErrorCode.TooManyAttempts,
    });
    expect(sessionWrites).toEqual([]);
  });

  it('lets a new emailed code clear the lock', async () => {
    const { mediator } = setupMediator();
    for (let i = 0; i < 3; i += 1) {
      await mediator.send(verifyEmailCode(EMAIL, '000000')).catch(() => undefined);
    }
    await mediator.send(requestEmailCode(EMAIL));

    await expect(mediator.send(verifyEmailCode(EMAIL, FAKE_AUTH.validCode))).resolves.toMatchObject(
      { status: SessionStatus.SignedIn },
    );
  });

  it.each([
    [AuthErrorCode.CodeExpired, AppErrorCode.CodeExpired],
    [AuthErrorCode.Network, AppErrorCode.Offline],
    [AuthErrorCode.Unknown, AppErrorCode.Unknown],
  ])('maps AuthError(%s) to AppError(%s)', async (authCode, appCode) => {
    const base = createServices({ mode: ServicesMode.Test }).auth;
    const { mediator } = setupMediator({
      auth: {
        ...base,
        verifyEmailCode: async () => {
          throw new AuthError(authCode);
        },
      },
    });

    const error = await mediator
      .send(verifyEmailCode(EMAIL, FAKE_AUTH.validCode))
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ code: appCode });
  });

  it('maps a 401 from the API after verifying to Unauthorized and writes nothing', async () => {
    const base = createServices({ mode: ServicesMode.Test }).api;
    const { mediator, sessionWrites } = setupMediator({
      api: {
        ...base,
        me: async () => {
          throw new ApiError(401);
        },
      },
    });

    await expect(mediator.send(verifyEmailCode(EMAIL, FAKE_AUTH.validCode))).rejects.toMatchObject({
      code: AppErrorCode.Unauthorized,
    });
    expect(sessionWrites).toEqual([]);
  });

  it('fails with Offline without calling the auth service when the device is offline', async () => {
    const base = createServices({ mode: ServicesMode.Test }).auth;
    const calls: string[] = [];
    const { mediator } = setupMediator({
      network: { isOnline: () => false },
      auth: {
        ...base,
        requestEmailCode: async (email) => void calls.push(email),
        verifyEmailCode: async (email) => void calls.push(email),
      },
    });

    await expect(mediator.send(requestEmailCode(EMAIL))).rejects.toMatchObject({
      code: AppErrorCode.Offline,
    });
    await expect(mediator.send(verifyEmailCode(EMAIL, FAKE_AUTH.validCode))).rejects.toMatchObject({
      code: AppErrorCode.Offline,
    });
    expect(calls).toEqual([]);
  });

  it.each([
    ['a malformed email', requestEmailCode('not-an-email')],
    ['an empty email', requestEmailCode('')],
    ['a malformed email on verify', verifyEmailCode('nope', FAKE_AUTH.validCode)],
    ['a short code', verifyEmailCode(EMAIL, '123')],
    ['a non-numeric code', verifyEmailCode(EMAIL, 'abcdef')],
    ['an empty callback url', startGoogleSignIn('')],
  ])('rejects %s with ValidationFailed before any service is called', async (_name, request) => {
    const calls: string[] = [];
    const record = async () => void calls.push('called');
    const { mediator } = setupMediator({
      auth: {
        requestEmailCode: record,
        verifyEmailCode: record,
        startGoogleSignIn: async () => (calls.push('called'), { redirectUrl: '' }),
        getToken: async () => (calls.push('called'), undefined),
        getSession: async () => (calls.push('called'), undefined),
        signOut: record,
      },
    });

    await expect(mediator.send(request)).rejects.toMatchObject({
      code: AppErrorCode.ValidationFailed,
    });
    expect(calls).toEqual([]);
  });

  it('trims the email and code before they reach the auth service', async () => {
    const base = createServices({ mode: ServicesMode.Test }).auth;
    const seen: string[] = [];
    const { mediator } = setupMediator({
      auth: {
        ...base,
        requestEmailCode: async (email) => void seen.push(email),
      },
    });

    await mediator.send(requestEmailCode(`  ${EMAIL} `));

    expect(seen).toEqual([EMAIL]);
  });

  it('never lets an email or a code reach the logger', async () => {
    const { mediator, logLines } = setupMediator();
    await mediator.send(requestEmailCode(EMAIL));
    await mediator.send(verifyEmailCode(EMAIL, '000000')).catch(() => undefined);
    await mediator.send(verifyEmailCode(EMAIL, FAKE_AUTH.validCode));
    await mediator.send(requestEmailCode('bad-email@')).catch(() => undefined);

    const logged = JSON.stringify(logLines);

    expect(logLines).toHaveLength(4);
    expect(logged).not.toContain('ada');
    expect(logged).not.toContain('example.com');
    expect(logged).not.toContain('bad-email');
    expect(logged).not.toContain('000000');
    expect(logged).not.toContain(FAKE_AUTH.validCode);
    expect(logLines.map((line) => line.outcome)).toEqual([
      RequestOutcome.Success,
      RequestOutcome.Failure,
      RequestOutcome.Success,
      RequestOutcome.Failure,
    ]);
    for (const line of logLines) {
      expect(Object.keys(line).sort()).toEqual(['durationMs', 'outcome', 'requestType']);
    }
  });
});

describe('session requests through the mediator', () => {
  it('signs out: clears the auth session and writes SignedOut', async () => {
    const { mediator, services, sessionWrites } = setupMediator();
    await mediator.send(verifyEmailCode(EMAIL, FAKE_AUTH.validCode));

    await mediator.send(signOut());

    expect(sessionWrites.at(-1)).toEqual({ status: SessionStatus.SignedOut });
    expect(await services.auth.getSession()).toBeUndefined();
  });

  it('getSession reports SignedIn for a live session and SignedOut otherwise', async () => {
    const { mediator, sessionWrites } = setupMediator();

    expect(await mediator.send(getSession())).toEqual({ status: SessionStatus.SignedOut });
    await mediator.send(verifyEmailCode(EMAIL, FAKE_AUTH.validCode));
    const signedIn = await mediator.send(getSession());

    expect(signedIn).toMatchObject({ status: SessionStatus.SignedIn });
    expect(sessionWrites.at(-1)).toEqual(signedIn);
  });

  it('starts Google sign-in and resolves the URL to continue at', async () => {
    const base = createServices({ mode: ServicesMode.Test }).auth;
    const seen: string[] = [];
    const { mediator } = setupMediator({
      auth: {
        ...base,
        startGoogleSignIn: async (callbackUrl) => {
          seen.push(callbackUrl);
          return { redirectUrl: 'https://accounts.google.example/auth' };
        },
      },
    });

    const result = await mediator.send(startGoogleSignIn('https://app.example/'));

    expect(result).toEqual({ redirectUrl: 'https://accounts.google.example/auth' });
    expect(seen).toEqual(['https://app.example/']);
  });
});
