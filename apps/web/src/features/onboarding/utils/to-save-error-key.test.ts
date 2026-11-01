import { AppError, AppErrorCode } from '@stamina/app-core';
import { describe, expect, it } from 'vitest';
import { OnboardingMessageKey } from '../enums/onboarding-message-key.ts';
import { toSaveErrorKey } from './to-save-error-key.ts';

describe('toSaveErrorKey', () => {
  it('explains being offline', () => {
    expect(toSaveErrorKey(new AppError(AppErrorCode.Offline))).toBe(OnboardingMessageKey.Offline);
  });

  it.each([
    [new AppError(AppErrorCode.Unknown)],
    [new AppError(AppErrorCode.ValidationFailed)],
    [new TypeError('bug')],
  ])('shows the generic message for %s', (error) => {
    expect(toSaveErrorKey(error)).toBe(OnboardingMessageKey.Unknown);
  });
});
