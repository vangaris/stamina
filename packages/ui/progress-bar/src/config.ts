import type { ProgressBarSize, ProgressBarTone } from './types.ts';

export const PROGRESS_BAR_FALLBACK_RANGE = { min: 0, max: 100 } as const;

export const PROGRESS_BAR_TONE_CLASSES: Record<ProgressBarTone, string> = {
  accent: 'bg-accent',
  load: 'bg-load',
  suggest: 'bg-suggest',
};

export const PROGRESS_BAR_SIZE_CLASSES: Record<ProgressBarSize, string> = {
  sm: 'h-2',
  md: 'h-3',
};
