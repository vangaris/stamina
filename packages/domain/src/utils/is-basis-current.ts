import type { AdaptationSession, SessionRevisionRef } from '../types.ts';

/**
 * Every Session revision in `basis` is still the current one among `sessions` and nothing was done
 * in it (not finished, no set logged): the only state a suggestion can still change.
 */
export function isBasisCurrent(
  basis: readonly SessionRevisionRef[],
  sessions: readonly AdaptationSession[],
): boolean {
  return basis.every(({ sessionId, revision }) =>
    sessions.some(
      (session) =>
        session.id === sessionId &&
        session.revision === revision &&
        !session.finished &&
        !session.started,
    ),
  );
}
