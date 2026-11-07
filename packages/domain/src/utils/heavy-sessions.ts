import { SessionFocus } from '../enums/session-focus.ts';
import type { AdaptationContext, AdaptationSession } from '../types.ts';
import { upcomingSessions } from './upcoming-sessions.ts';

/** The current heavy Sessions: upcoming (see `upcomingSessions`) and not Recovery. */
export function heavySessions(context: AdaptationContext): AdaptationSession[] {
  return upcomingSessions(context).filter((session) => session.focus !== SessionFocus.Recovery);
}
