import { ApiError } from '@stamina/contracts';
import { HTTP_CLIENT_ERROR, RETRYABLE_CLIENT_STATUSES } from '../config.ts';

/**
 * False when the server read a request and refused it in a way that sending it again cannot
 * change: an `ApiError` with a 4xx status, except the ones that are about the moment rather than
 * the request (401, 408, 429; see `RETRYABLE_CLIENT_STATUSES`). Every other failure is retryable:
 * no network, a 5xx, and anything unrecognised (a later send may work, so it is not given up on).
 * The offline queue step and the sync runner both decide with this, so a request is queued
 * exactly when replaying it is worthwhile.
 */
export function isRetryableFailure(thrown: unknown): boolean {
  if (!(thrown instanceof ApiError)) return true;
  const { status } = thrown;
  return !(
    status >= HTTP_CLIENT_ERROR.min &&
    status <= HTTP_CLIENT_ERROR.max &&
    !RETRYABLE_CLIENT_STATUSES.includes(status)
  );
}
