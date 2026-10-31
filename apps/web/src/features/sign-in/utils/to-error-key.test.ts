import { AppError, AppErrorCode } from '@stamina/app-core';
import { describe, expect, it } from 'vitest';
import { SignInMessageKey } from '../enums/sign-in-message-key.ts';
import { SignInStep } from '../enums/sign-in-step.ts';
import { toErrorKey } from './to-error-key.ts';

describe('toErrorKey', () => {
  it('words a validation failure for the screen it happened on', () => {
    const error = new AppError(AppErrorCode.ValidationFailed);
    expect(toErrorKey(SignInStep.Email, error)).toBe(SignInMessageKey.EmailInvalid);
    expect(toErrorKey(SignInStep.Code, error)).toBe(SignInMessageKey.CodeInvalidFormat);
  });

  it.each([
    [AppErrorCode.InvalidCode, SignInMessageKey.InvalidCode],
    [AppErrorCode.CodeExpired, SignInMessageKey.CodeExpired],
    [AppErrorCode.TooManyAttempts, SignInMessageKey.TooManyAttempts],
    [AppErrorCode.Offline, SignInMessageKey.Offline],
    [AppErrorCode.Unauthorized, SignInMessageKey.Unknown],
    [AppErrorCode.Unknown, SignInMessageKey.Unknown],
  ])('maps %s to %s', (code, key) => {
    expect(toErrorKey(SignInStep.Code, new AppError(code))).toBe(key);
  });

  it('shows the generic message for anything that is not an AppError', () => {
    expect(toErrorKey(SignInStep.Code, new TypeError('boom'))).toBe(SignInMessageKey.Unknown);
  });
});
