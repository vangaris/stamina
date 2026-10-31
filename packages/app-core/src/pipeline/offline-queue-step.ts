import { QUEUED_RESULT } from '../config.ts';
import { AppErrorCode } from '../enums/app-error-code.ts';
import { OfflinePolicy } from '../enums/offline-policy.ts';
import { AppError } from '../errors/app-error.ts';
import type { PipelineStep } from '../types.ts';

/** While offline, applies the request's `OfflinePolicy`; online it does nothing. */
export const offlineQueueStep: PipelineStep = async (context, next) => {
  const { network, offlineQueue } = context.services;
  const { offline } = context.definition;
  if (network.isOnline() || offline === OfflinePolicy.Always) return next(context);
  switch (offline) {
    case OfflinePolicy.Queue:
      await offlineQueue.enqueue(context.request);
      return QUEUED_RESULT;
    case OfflinePolicy.Never:
      throw new AppError(AppErrorCode.Offline);
  }
};
