import type { AdaptationContext, AdaptationSession } from '../types.ts';
import { compareText } from './compare-text.ts';

/** The current Sessions nothing was done in yet (not finished, not started) dated today or later, in date order (ties by id). */
export function upcomingSessions({ sessions, today }: AdaptationContext): AdaptationSession[] {
  return sessions
    .filter((session) => !session.finished && !session.started && session.date >= today)
    .sort((a, b) => compareText(a.date, b.date) || compareText(a.id, b.id));
}
