import { ApiError } from '@stamina/contracts';
import { APP_ERROR_FOR_AUTH_ERROR, HTTP_UNAUTHORIZED } from '../config.ts';
import { AppErrorCode } from '../enums/app-error-code.ts';
import { AppError } from '../errors/app-error.ts';
import { AuthError } from '../errors/auth-error.ts';

/** Maps anything thrown to an `AppError`. The original message and cause are dropped on purpose. */
export function toAppError(thrown: unknown): AppError {
  if (thrown instanceof AppError) return thrown;
  if (thrown instanceof AuthError) return new AppError(APP_ERROR_FOR_AUTH_ERROR[thrown.code]);
  if (thrown instanceof ApiError && thrown.status === HTTP_UNAUTHORIZED) {
    return new AppError(AppErrorCode.Unauthorized);
  }
  return new AppError(AppErrorCode.Unknown);
}
