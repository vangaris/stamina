import { AppError, AppErrorCode } from '@stamina/app-core';
import { OnboardingMessageKey } from '../enums/onboarding-message-key.ts';

/** The message for a save that failed for a reason that is not the person's answers. */
export function toSaveErrorKey(error: unknown): OnboardingMessageKey {
  const code = error instanceof AppError ? error.code : AppErrorCode.Unknown;
  return code === AppErrorCode.Offline
    ? OnboardingMessageKey.Offline
    : OnboardingMessageKey.Unknown;
}
