import { ApiError } from '@stamina/contracts';
import { describe, expect, it } from 'vitest';
import { isRetryableFailure } from './is-retryable-failure.ts';

describe('isRetryableFailure', () => {
  it.each([400, 403, 404, 409, 410, 413, 422, 499])('is false for a %i answer', (status) => {
    expect(isRetryableFailure(new ApiError(status))).toBe(false);
  });

  it.each([401, 408, 429])('is true for %i: a later send can work', (status) => {
    expect(isRetryableFailure(new ApiError(status))).toBe(true);
  });

  it.each([399, 500, 502, 503, 504])('is true outside 4xx (%i)', (status) => {
    expect(isRetryableFailure(new ApiError(status))).toBe(true);
  });

  it('is true for anything that is not an ApiError', () => {
    expect(isRetryableFailure(new TypeError('Failed to fetch'))).toBe(true);
    expect(isRetryableFailure(new Error('boom'))).toBe(true);
    expect(isRetryableFailure({ status: 404 })).toBe(true);
    expect(isRetryableFailure(undefined)).toBe(true);
  });
});
