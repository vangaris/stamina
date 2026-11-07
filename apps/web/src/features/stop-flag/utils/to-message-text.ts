import type { StopFlagMessageKey } from '../enums/stop-flag-message-key.ts';

/** The words for a message key a composable handed over, or nothing when there is none. */
export function toMessageText(
  t: (key: string) => string,
  key: StopFlagMessageKey | undefined,
): string | undefined {
  return key ? t(key) : undefined;
}
