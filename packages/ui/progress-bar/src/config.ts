import { ProgressBarSize } from './enums/progress-bar-size.ts';
import { ProgressBarTone } from './enums/progress-bar-tone.ts';

export const PROGRESS_BAR_FALLBACK_RANGE = { min: 0, max: 100 } as const;

export const PROGRESS_BAR_TONE_CLASSES: Record<ProgressBarTone, string> = {
  [ProgressBarTone.Accent]: 'bg-accent',
  [ProgressBarTone.Load]: 'bg-load',
  [ProgressBarTone.Suggest]: 'bg-suggest',
};

export const PROGRESS_BAR_SIZE_CLASSES: Record<ProgressBarSize, string> = {
  [ProgressBarSize.Sm]: 'h-2',
  [ProgressBarSize.Md]: 'h-3',
};
