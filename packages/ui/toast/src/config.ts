import type { ToastTone } from './types.ts';

export const DEFAULT_DURATION_MS = 5000;

export const TOAST_TONE_CLASSES: Record<ToastTone, string> = {
  info: 'border-border-strong bg-surface text-text',
  success: 'border-accent bg-accent-soft text-on-accent-soft',
  danger: 'border-danger bg-danger-soft text-on-danger-soft',
};

// Distinct glyph per tone, so the tone never relies on colour alone.
export const TOAST_TONE_ICON_PATHS: Record<ToastTone, string> = {
  info: 'M8 7.5v4M8 4.75v.01M8 14.25a6.25 6.25 0 100-12.5 6.25 6.25 0 000 12.5z',
  success: 'M4.5 8.5l2.5 2.5 4.5-5M8 14.25a6.25 6.25 0 100-12.5 6.25 6.25 0 000 12.5z',
  danger: 'M8 6v3.5M8 11.75v.01M8 2L1.75 13.25h12.5z',
};

export const TOAST_REGION_PLACEMENT_CLASSES = {
  // Clears the bottom navigation (one tap target tall) and the phone's home indicator.
  fixed: 'fixed pb-[calc(env(safe-area-inset-bottom)+var(--st-space-tap)+var(--st-space-4))]',
  absolute: 'absolute pb-2',
} as const;
