import { AppError, AppErrorCode } from '@stamina/app-core';
import { SignInMessageKey } from '../enums/sign-in-message-key.ts';
import { SignInStep } from '../enums/sign-in-step.ts';

/**
 * Maps what the mediator rejected with to the message the person sees. A bad value means a
 * different thing on each screen, so the step decides which validation message applies.
 * Anything that is not an `AppError` is a bug, shown as the generic message.
 */
export function toErrorKey(step: SignInStep, error: unknown): SignInMessageKey {
  const code = error instanceof AppError ? error.code : AppErrorCode.Unknown;
  switch (code) {
    case AppErrorCode.ValidationFailed:
      return step === SignInStep.Email
        ? SignInMessageKey.EmailInvalid
        : SignInMessageKey.CodeInvalidFormat;
    case AppErrorCode.InvalidCode:
      return SignInMessageKey.InvalidCode;
    case AppErrorCode.CodeExpired:
      return SignInMessageKey.CodeExpired;
    case AppErrorCode.TooManyAttempts:
      return SignInMessageKey.TooManyAttempts;
    case AppErrorCode.Offline:
      return SignInMessageKey.Offline;
    default:
      return SignInMessageKey.Unknown;
  }
}
