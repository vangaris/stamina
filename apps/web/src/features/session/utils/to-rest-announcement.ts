import { RestMessageKey } from '../enums/rest-message-key.ts';
import type { RestAnnouncement } from '../types.ts';

/** The message a screen reader gets for a moment of the rest: the seconds left, or that the rest is over. */
export function toRestAnnouncement(seconds: number): RestAnnouncement {
  return seconds === 0
    ? { key: RestMessageKey.Over, params: { seconds } }
    : { key: RestMessageKey.Announce, params: { seconds } };
}
