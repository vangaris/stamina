import { DEFAULT_DURATION_MS } from '../config.ts';
import { ToastTone } from '../enums/toast-tone.ts';

/** Milliseconds until a toast dismisses itself, or `null` when it stays until closed. */
export function resolveToastDuration(
  durationMs: number | null | undefined,
  tone: ToastTone,
): number | null {
  if (durationMs !== undefined) return durationMs;
  return tone === ToastTone.Danger ? null : DEFAULT_DURATION_MS;
}
