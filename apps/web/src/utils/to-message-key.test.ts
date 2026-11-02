import { AppError, AppErrorCode } from '@stamina/app-core';
import { describe, expect, it } from 'vitest';
import { toMessageKey } from './to-message-key.ts';

const table = { [AppErrorCode.Offline]: 'offline' };

describe('toMessageKey', () => {
  it('uses the table entry for the error code', () => {
    expect(toMessageKey(new AppError(AppErrorCode.Offline), table, 'unknown')).toBe('offline');
  });

  it('falls back for a code with no entry and for anything that is not an AppError', () => {
    expect(toMessageKey(new AppError(AppErrorCode.Unknown), table, 'unknown')).toBe('unknown');
    expect(toMessageKey(new Error('bug'), table, 'unknown')).toBe('unknown');
  });
});
