import { AppError, AppErrorCode } from '@stamina/app-core';

/**
 * The message for what the mediator rejected with: the table's entry for its code, else the
 * fallback. Anything that is not an `AppError` is a bug and gets the fallback too.
 */
export function toMessageKey<K>(
  error: unknown,
  table: Partial<Record<AppErrorCode, K>>,
  fallback: K,
): K {
  return (error instanceof AppError && table[error.code]) || fallback;
}
