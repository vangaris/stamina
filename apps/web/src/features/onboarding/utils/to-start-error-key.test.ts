import { AppError, AppErrorCode } from '@stamina/app-core';
import { describe, expect, it } from 'vitest';
import { StartMessageKey } from '../enums/start-message-key.ts';
import { toStartErrorKey } from './to-start-error-key.ts';

describe('toStartErrorKey', () => {
  it.each([
    [new AppError(AppErrorCode.ValidationFailed), StartMessageKey.Empty],
    [new AppError(AppErrorCode.Offline), StartMessageKey.Offline],
    [new AppError(AppErrorCode.Unknown), StartMessageKey.Unknown],
    [new TypeError('bug'), StartMessageKey.Unknown],
  ])('maps %s', (error, key) => {
    expect(toStartErrorKey(error)).toBe(key);
  });
});
