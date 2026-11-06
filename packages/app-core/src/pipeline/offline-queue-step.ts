import { QUEUED_RESULT } from '../config.ts';
import { AppErrorCode } from '../enums/app-error-code.ts';
import { OfflinePolicy } from '../enums/offline-policy.ts';
import { AppError } from '../errors/app-error.ts';
import type { PipelineContext, PipelineStep } from '../types.ts';
import { isRetryableFailure } from '../utils/is-retryable-failure.ts';

async function queue({ request, services }: PipelineContext) {
  await services.offlineQueue.enqueue(request);
  return QUEUED_RESULT;
}

/**
 * Applies the request's `OfflinePolicy`. Offline: `Queue` waits in the queue, `Never` rejects.
 * Online, a `Queue` request still waits when requests are already waiting (it must not overtake
 * them: a finish ahead of earlier sets would make the server refuse those sets) and also when
 * the send fails in a way worth retrying (`isRetryableFailure`: no network, 401, 408, 429, a
 * server error, anything unrecognised): the request is already written on the device, so it must
 * reach the queue or it would never sync. A permanent client error is not queued (the server will
 * never accept it) and reaches the caller.
 */
export const offlineQueueStep: PipelineStep = async (context, next) => {
  const { network, offlineQueue } = context.services;
  const { offline } = context.definition;
  if (offline === OfflinePolicy.Always) return next(context);
  if (!network.isOnline()) {
    if (offline === OfflinePolicy.Queue) return queue(context);
    throw new AppError(AppErrorCode.Offline);
  }
  if (offline !== OfflinePolicy.Queue) return next(context);

  if ((await offlineQueue.pending()).length > 0) return queue(context);
  try {
    return await next(context);
  } catch (thrown) {
    if (isRetryableFailure(thrown)) return queue(context);
    throw thrown;
  }
};
