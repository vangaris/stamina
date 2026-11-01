import { AppErrorCode } from './enums/app-error-code.ts';
import { AuthErrorCode } from './enums/auth-error-code.ts';
import { BetterAuthErrorCode } from './enums/better-auth-error-code.ts';
import type { Queued } from './types.ts';

export const QUEUED_RESULT: Queued = Object.freeze({ queued: true });

/** Digits in an emailed code (Better Auth's Email OTP default). */
export const OTP_LENGTH = 6;

export const APP_ERROR_FOR_AUTH_ERROR: Record<AuthErrorCode, AppErrorCode> = {
  [AuthErrorCode.InvalidCode]: AppErrorCode.InvalidCode,
  [AuthErrorCode.CodeExpired]: AppErrorCode.CodeExpired,
  [AuthErrorCode.TooManyAttempts]: AppErrorCode.TooManyAttempts,
  [AuthErrorCode.Network]: AppErrorCode.Offline,
  [AuthErrorCode.Unknown]: AppErrorCode.Unknown,
};

export const AUTH_ERROR_FOR_BETTER_AUTH_CODE: Record<BetterAuthErrorCode, AuthErrorCode> = {
  [BetterAuthErrorCode.InvalidOtp]: AuthErrorCode.InvalidCode,
  [BetterAuthErrorCode.OtpExpired]: AuthErrorCode.CodeExpired,
  [BetterAuthErrorCode.TooManyAttempts]: AuthErrorCode.TooManyAttempts,
};

export const HTTP_UNAUTHORIZED = 401;

export const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

/** The fake `AuthService` (Test and Dev modes). */
export const FAKE_AUTH = {
  validCode: '424242',
  /** The Nth wrong code for one email throws `TooManyAttempts`; a new code request resets it. */
  maxWrongCodes: 3,
  /** The fake API reads the user id from this token, like the real API reads `sub`. */
  tokenPrefix: 'fake-jwt:',
} as const;

/** A cached API token is dropped this long before its `exp`, so it never expires in flight. */
export const TOKEN_EXPIRY_MARGIN_MS = 30_000;
