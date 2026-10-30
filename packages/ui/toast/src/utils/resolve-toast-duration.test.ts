import { describe, expect, it } from 'vitest';
import { DEFAULT_DURATION_MS } from '../config.ts';
import { ToastTone } from '../enums/toast-tone.ts';
import { resolveToastDuration } from './resolve-toast-duration.ts';

describe('resolveToastDuration', () => {
  it.each([ToastTone.Info, ToastTone.Success] as const)(
    'defaults %s toasts to the default duration',
    (tone) => {
      expect(resolveToastDuration(undefined, tone)).toBe(DEFAULT_DURATION_MS);
    },
  );

  it('keeps danger toasts until closed by default', () => {
    expect(resolveToastDuration(undefined, ToastTone.Danger)).toBeNull();
  });

  it('honours an explicit duration for every tone, danger included', () => {
    expect(resolveToastDuration(1200, ToastTone.Danger)).toBe(1200);
    expect(resolveToastDuration(1200, ToastTone.Info)).toBe(1200);
  });

  it('treats null as "stay", and keeps 0 as a real duration', () => {
    expect(resolveToastDuration(null, ToastTone.Info)).toBeNull();
    expect(resolveToastDuration(0, ToastTone.Info)).toBe(0);
  });
});
