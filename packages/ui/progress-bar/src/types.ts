import type { ProgressBarSize } from './enums/progress-bar-size.ts';
import type { ProgressBarTone } from './enums/progress-bar-tone.ts';

export interface ProgressBarProps {
  value: number;
  min?: number;
  max?: number;
  /** Accessible name. Always required. */
  label: string;
  /** Human readable value for `aria-valuetext`, e.g. "2 of 3 sessions". */
  valueText?: string;
  tone?: ProgressBarTone;
  size?: ProgressBarSize;
  /** Show `label` as visible text above the bar. */
  showLabel?: boolean;
}

export interface ProgressMetrics {
  min: number;
  max: number;
  /** `value` clamped into `[min, max]`. */
  now: number;
  /** Fill, 0-100. */
  percent: number;
}
