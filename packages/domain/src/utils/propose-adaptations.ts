import type { AdaptationContext, AdaptationProposal } from '../types.ts';
import { proposeCheckins } from './propose-checkins.ts';
import { proposeDeload } from './propose-deload.ts';
import { proposeMissedSessions } from './propose-missed-sessions.ts';
import { proposeUnplannedActivity } from './propose-unplanned-activity.ts';

/**
 * The Adaptations the rules raise now that are not stored yet, in a fixed order: unplanned
 * Activities, Check-ins, early Deload, missed Sessions. Pure and deterministic; a rule and trigger
 * already in `history` is not raised again (only a declined Deload is asked again, after
 * `ADAPTATION_REASK_DAYS`, while its reason holds). Nothing here changes the Program: the person
 * accepts first (`applyAdaptation`). Every change only ever lightens: never more sets, fewer
 * reps in reserve or a Session earlier than today.
 */
export function proposeAdaptations(context: AdaptationContext): AdaptationProposal[] {
  return [
    ...proposeUnplannedActivity(context),
    ...proposeCheckins(context),
    ...proposeDeload(context),
    ...proposeMissedSessions(context),
  ];
}
