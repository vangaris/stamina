import { resolveStopState, type StopState, type StoredStopFlag } from '@stamina/domain';

/**
 * The server's stop state plus the flags reported on this device that it does not know yet
 * (`resolveStopState` over `local`, all open). Pauses and excluded areas are unioned, server's
 * first; the rest day is the later of the two. Neither input changes.
 */
export function mergeStopState(server: StopState, local: readonly StoredStopFlag[]): StopState {
  if (local.length === 0) return server;
  const added = resolveStopState(local);
  const restDays = [server.restOn, added.restOn].filter((day) => day !== null);
  return {
    pausing: [...new Set([...server.pausing, ...added.pausing])],
    restOn: restDays.length === 0 ? null : restDays.reduce((a, b) => (a > b ? a : b)),
    excludedAreas: [...new Set([...server.excludedAreas, ...added.excludedAreas])],
  };
}
