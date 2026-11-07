import type { AdaptationContext, SessionRevisionRef } from '@stamina/domain';

/** Every Session revision in `basis` is still the current one and nothing was done in it (not finished, no set logged). */
export function isBasisCurrent(
  basis: readonly SessionRevisionRef[],
  { sessions }: AdaptationContext,
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
