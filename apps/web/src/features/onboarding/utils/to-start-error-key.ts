import { AppError, AppErrorCode } from '@stamina/app-core';
import { StartMessageKey } from '../enums/start-message-key.ts';

/** The message for an invite check that did not get an answer; an empty code is the person's to fix. */
export function toStartErrorKey(error: unknown): StartMessageKey {
  const code = error instanceof AppError ? error.code : AppErrorCode.Unknown;
  switch (code) {
    case AppErrorCode.ValidationFailed:
      return StartMessageKey.Empty;
    case AppErrorCode.Offline:
      return StartMessageKey.Offline;
    default:
      return StartMessageKey.Unknown;
  }
}
