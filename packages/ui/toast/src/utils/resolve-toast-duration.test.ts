import { describe, expect, it } from 'vitest';
import { DEFAULT_DURATION_MS } from '../config.ts';
import { resolveToastDuration } from './resolve-toast-duration.ts';

describe('resolveToastDuration', () => {
  it.each(['info', 'success'] as const)('defaults %s toasts to the default duration', (tone) => {
    expect(resolveToastDuration(undefined, tone)).toBe(DEFAULT_DURATION_MS);
  });

  it('keeps danger toasts until closed by default', () => {
    expect(resolveToastDuration(undefined, 'danger')).toBeNull();
  });

  it('honours an explicit duration for every tone, danger included', () => {
    expect(resolveToastDuration(1200, 'danger')).toBe(1200);
    expect(resolveToastDuration(1200, 'info')).toBe(1200);
  });

  it('treats null as "stay", and keeps 0 as a real duration', () => {
    expect(resolveToastDuration(null, 'info')).toBeNull();
    expect(resolveToastDuration(0, 'info')).toBe(0);
  });
});
