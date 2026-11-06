import type { Queued } from '@stamina/app-core';

/** The request was saved on the device and waits for a connection, instead of reaching the server. */
export function isQueued<T extends object>(result: T | Queued): result is Queued {
  return 'queued' in result;
}
