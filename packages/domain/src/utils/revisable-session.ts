import type { AdaptationContext, AdaptationSession } from '../types.ts';

/** The current Session with this id when nothing was done in it yet (no finish record, no logged set), else `undefined`. */
export function revisableSession(
  context: AdaptationContext,
  sessionId: string,
): AdaptationSession | undefined {
  return context.sessions.find(
    (session) => session.id === sessionId && !session.finished && !session.started,
  );
}
