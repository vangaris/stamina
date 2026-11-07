import type { Checkin } from '@stamina/contracts';
import type { LocalCheckin } from '../types.ts';

/**
 * The latest Check-in as the Check-in screen reads it: the server's, or this device's when that is
 * newer (later day, or the same day and recorded later). The same id is the same Check-in, so
 * the server's copy wins. Neither input changes.
 */
export function mergeLocalCheckin(
  server: Checkin | null,
  local: LocalCheckin | null,
): Checkin | null {
  if (local === null) return server;
  const { checkin, recordedAt } = local;
  if (server !== null) {
    if (server.id === checkin.id) return server;
    const serverIsNewer =
      server.date > checkin.date ||
      (server.date === checkin.date && server.submittedAt >= recordedAt);
    if (serverIsNewer) return server;
  }
  return { ...checkin, submittedAt: recordedAt };
}
