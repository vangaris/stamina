import {
  AppError,
  AppErrorCode,
  RequestType,
  SessionStatus,
  type Mediator,
  type Request,
} from '@stamina/app-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope } from 'vue';
import { RESEND_COOLDOWN_SECONDS } from '../config.ts';
import { SignInMessageKey } from '../enums/sign-in-message-key.ts';
import { SignInStep } from '../enums/sign-in-step.ts';
import { useSignIn } from './useSignIn.ts';

/** A mediator whose answer per request type is scripted; records what was sent. */
function fakeMediator(answers: Partial<Record<RequestType, () => unknown>>) {
  const sent: Request[] = [];
  const mediator = {
    async send(request: Request) {
      sent.push(request);
      const answer = answers[request.type as RequestType];
      if (!answer) throw new Error(`unscripted ${request.type}`);
      const result = answer();
      if (result instanceof Error) throw result;
      return result;
    },
  } as Mediator;
  return { mediator, sent };
}

function setup(answers: Partial<Record<RequestType, () => unknown>>) {
  const { mediator, sent } = fakeMediator(answers);
  const onSignedIn = vi.fn();
  const redirect = vi.fn();
  const scope = effectScope();
  const signIn = scope.run(() =>
    useSignIn({ mediator, onSignedIn, redirect, callbackUrl: 'https://app.test/today' }),
  )!;
  return { signIn, sent, onSignedIn, redirect, scope };
}

const signedIn = () => ({ status: SessionStatus.SignedIn, userId: 'u1' });

describe('useSignIn', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('moves to the code step once the email was accepted, and starts the resend cooldown', async () => {
    const { signIn, scope } = setup({ [RequestType.RequestEmailCode]: () => undefined });

    signIn.setEmail('  ada@example.com ');
    await signIn.submitEmail();

    expect(signIn.step.value).toBe(SignInStep.Code);
    expect(signIn.email.value).toBe('ada@example.com');
    expect(signIn.errorKey.value).toBeUndefined();
    expect(signIn.resendSeconds.value).toBe(RESEND_COOLDOWN_SECONDS);
    scope.stop();
  });

  it('stays on the email step with a message when the email is rejected', async () => {
    const { signIn, scope } = setup({
      [RequestType.RequestEmailCode]: () => new AppError(AppErrorCode.ValidationFailed),
    });

    signIn.setEmail('nope');
    await signIn.submitEmail();

    expect(signIn.step.value).toBe(SignInStep.Email);
    expect(signIn.errorKey.value).toBe(SignInMessageKey.EmailInvalid);
    signIn.setEmail('nope@');
    expect(signIn.errorKey.value).toBeUndefined();
    scope.stop();
  });

  it('signs in with the code, and only then calls onSignedIn', async () => {
    const { signIn, sent, onSignedIn, scope } = setup({
      [RequestType.RequestEmailCode]: () => undefined,
      [RequestType.VerifyEmailCode]: signedIn,
    });
    signIn.setEmail('ada@example.com');
    await signIn.submitEmail();

    signIn.setCode('424 242');
    await signIn.submitCode();

    expect(sent.at(-1)).toMatchObject({
      type: RequestType.VerifyEmailCode,
      email: 'ada@example.com',
      code: '424242',
    });
    expect(onSignedIn).toHaveBeenCalledOnce();
    scope.stop();
  });

  it.each([
    [AppErrorCode.InvalidCode, SignInMessageKey.InvalidCode],
    [AppErrorCode.TooManyAttempts, SignInMessageKey.TooManyAttempts],
    [AppErrorCode.CodeExpired, SignInMessageKey.CodeExpired],
    [AppErrorCode.Offline, SignInMessageKey.Offline],
  ])('shows the message for %s and stays signed out', async (code, key) => {
    const { signIn, onSignedIn, scope } = setup({
      [RequestType.RequestEmailCode]: () => undefined,
      [RequestType.VerifyEmailCode]: () => new AppError(code),
    });
    signIn.setEmail('ada@example.com');
    await signIn.submitEmail();

    signIn.setCode('000000');
    await signIn.submitCode();

    expect(signIn.step.value).toBe(SignInStep.Code);
    expect(signIn.errorKey.value).toBe(key);
    expect(onSignedIn).not.toHaveBeenCalled();
    expect(signIn.busy.value).toBe(false);
    scope.stop();
  });

  it('offers a new code only after the cooldown, then confirms it was sent', async () => {
    const { signIn, sent, scope } = setup({ [RequestType.RequestEmailCode]: () => undefined });
    signIn.setEmail('ada@example.com');
    await signIn.submitEmail();

    await signIn.resend();
    expect(sent).toHaveLength(1);

    vi.advanceTimersByTime(RESEND_COOLDOWN_SECONDS * 1000);
    await signIn.resend();
    expect(sent).toHaveLength(2);
    expect(signIn.noticeKey.value).toBe(SignInMessageKey.CodeResent);
    expect(signIn.resendSeconds.value).toBe(RESEND_COOLDOWN_SECONDS);
    scope.stop();
  });

  it('goes back to the email step and forgets the code and its error', async () => {
    const { signIn, scope } = setup({
      [RequestType.RequestEmailCode]: () => undefined,
      [RequestType.VerifyEmailCode]: () => new AppError(AppErrorCode.InvalidCode),
    });
    signIn.setEmail('ada@example.com');
    await signIn.submitEmail();
    signIn.setCode('000000');
    await signIn.submitCode();

    signIn.back();

    expect(signIn.step.value).toBe(SignInStep.Email);
    expect(signIn.code.value).toBe('');
    expect(signIn.errorKey.value).toBeUndefined();
    expect(signIn.email.value).toBe('ada@example.com');
    scope.stop();
  });

  it('sends the browser to the Google URL', async () => {
    const { signIn, sent, redirect, scope } = setup({
      [RequestType.StartGoogleSignIn]: () => ({ redirectUrl: 'https://accounts.google.test/x' }),
    });

    await signIn.signInWithGoogle();

    expect(sent[0]).toMatchObject({
      type: RequestType.StartGoogleSignIn,
      callbackUrl: 'https://app.test/today',
    });
    expect(redirect).toHaveBeenCalledWith('https://accounts.google.test/x');
    scope.stop();
  });
});
