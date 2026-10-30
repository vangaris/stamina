import { DEFAULT_DURATION_MS } from '../config.ts';
import type { ToastTone } from '../types.ts';

/** Milliseconds until a toast dismisses itself, or `null` when it stays until closed. */
export function resolveToastDuration(
  durationMs: number | null | undefined,
  tone: ToastTone,
): number | null {
  if (durationMs !== undefined) return durationMs;
  return tone === 'danger' ? null : DEFAULT_DURATION_MS;
}
