import { AppErrorCode } from '../enums/app-error-code.ts';
import { AuthErrorCode } from '../enums/auth-error-code.ts';
import { AppError } from '../errors/app-error.ts';
import { AuthError } from '../errors/auth-error.ts';

/**
 * True when a call failed to reach the server, as opposed to the server answering no: `fetch`
 * rejects with a `TypeError` when there is no connection, and the auth service and the pipeline
 * report the same condition as their own offline errors. An `ApiError` (the server answered) is not one.
 */
export function isNetworkFailure(thrown: unknown): boolean {
  if (thrown instanceof TypeError) return true;
  if (thrown instanceof AuthError) return thrown.code === AuthErrorCode.Network;
  return thrown instanceof AppError && thrown.code === AppErrorCode.Offline;
}
