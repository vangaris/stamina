import { AdaptationChangeKind, AdaptationRule } from '@stamina/domain';
import { RoutePath } from '../../enums/route-path.ts';

/** The message that words each kind of change. */
export const CHANGE_MESSAGE_KEYS: Record<AdaptationChangeKind, string> = {
  [AdaptationChangeKind.MoveSession]: 'adaptation.change.move-session',
  [AdaptationChangeKind.SwapToRecovery]: 'adaptation.change.swap-to-recovery',
  [AdaptationChangeKind.DropSet]: 'adaptation.change.drop-set',
  [AdaptationChangeKind.LightenSession]: 'adaptation.change.lighten-session',
  [AdaptationChangeKind.SwapExercises]: 'adaptation.change.swap-exercises',
  [AdaptationChangeKind.DeloadWeek]: 'adaptation.change.deload-week',
  [AdaptationChangeKind.RepeatWeek]: 'adaptation.change.repeat-week',
  [AdaptationChangeKind.RestartBlock]: 'adaptation.change.restart-block',
};

/** The message that explains each rule's suggestion, filled from the suggestion's `params`. */
export const REASON_MESSAGE_KEYS: Record<AdaptationRule, string> = {
  [AdaptationRule.UnplannedActivity]: 'adaptation.reason.unplanned-activity',
  [AdaptationRule.PoorCheckin]: 'adaptation.reason.poor-checkin',
  [AdaptationRule.SoreArea]: 'adaptation.reason.sore-area',
  [AdaptationRule.DeloadLoad]: 'adaptation.reason.deload-load',
  [AdaptationRule.DeloadCheckins]: 'adaptation.reason.deload-checkins',
  [AdaptationRule.DeloadEffort]: 'adaptation.reason.deload-effort',
  [AdaptationRule.RepeatWeek]: 'adaptation.reason.repeat-week',
  [AdaptationRule.RestartBlock]: 'adaptation.reason.restart-block',
};

export const ROUTE_WHEN_SIGNED_OUT = RoutePath.Start;
