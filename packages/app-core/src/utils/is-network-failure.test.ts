import { ApiError } from '@stamina/contracts';
import { describe, expect, it } from 'vitest';
import { AppErrorCode } from '../enums/app-error-code.ts';
import { AuthErrorCode } from '../enums/auth-error-code.ts';
import { AppError } from '../errors/app-error.ts';
import { AuthError } from '../errors/auth-error.ts';
import { isNetworkFailure } from './is-network-failure.ts';

describe('isNetworkFailure', () => {
  it('is true for fetch rejecting, an offline AppError and a network AuthError', () => {
    expect(isNetworkFailure(new TypeError('Failed to fetch'))).toBe(true);
    expect(isNetworkFailure(new AppError(AppErrorCode.Offline))).toBe(true);
    expect(isNetworkFailure(new AuthError(AuthErrorCode.Network))).toBe(true);
  });

  it('is false when the server answered or the failure is something else', () => {
    expect(isNetworkFailure(new ApiError(500))).toBe(false);
    expect(isNetworkFailure(new ApiError(404))).toBe(false);
    expect(isNetworkFailure(new AppError(AppErrorCode.Unauthorized))).toBe(false);
    expect(isNetworkFailure(new AuthError(AuthErrorCode.InvalidCode))).toBe(false);
    expect(isNetworkFailure(new Error('boom'))).toBe(false);
    expect(isNetworkFailure(undefined)).toBe(false);
  });
});
