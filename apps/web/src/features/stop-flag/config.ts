import { AppErrorCode } from '@stamina/app-core';
import { ScreeningRejection } from '@stamina/contracts';
import { StopAction, StopFlag } from '@stamina/domain';
import { RoutePath } from '../../enums/route-path.ts';
import { StopFlagMessageKey } from './enums/stop-flag-message-key.ts';
import { StopOutcomeKind } from './enums/stop-outcome-kind.ts';

/** The seven options of "Anything unusual today?", in the order the sheet lists them. */
export const STOP_FLAG_OPTIONS: readonly StopFlag[] = Object.values(StopFlag);

/** What each action of a stop flag means to the person reading about it. */
export const OUTCOME_KIND_FOR_ACTION: Record<StopAction, StopOutcomeKind> = {
  [StopAction.PauseUntilDoctor]: StopOutcomeKind.PausedDoctor,
  [StopAction.PauseUntilCleared]: StopOutcomeKind.PausedCleared,
  [StopAction.RestToday]: StopOutcomeKind.Rest,
  [StopAction.ExcludeArea]: StopOutcomeKind.AreaExcluded,
};

/** The outcomes that pause training: the person is taken to the paused screen. */
export const PAUSING_OUTCOME_KINDS: readonly StopOutcomeKind[] = [
  StopOutcomeKind.PausedDoctor,
  StopOutcomeKind.PausedCleared,
];

/** Where a person goes when the server refuses the repeated Screening questions: back to the step it needs first. */
export const RECHECK_REJECTION_ROUTES: Record<ScreeningRejection, RoutePath> = {
  [ScreeningRejection.ConsentMissing]: RoutePath.Consent,
  [ScreeningRejection.ProfileMissing]: RoutePath.Onboarding,
  [ScreeningRejection.NoScreening]: RoutePath.Screening,
};

/** What the repeated questions show when the request fails: the message for its error code, else the generic one. */
export const RECHECK_ERROR_KEYS: Partial<Record<AppErrorCode, StopFlagMessageKey>> = {
  [AppErrorCode.Offline]: StopFlagMessageKey.RecheckOffline,
};

/** What the paused screen shows when confirming fails. */
export const PAUSED_ERROR_KEYS: Partial<Record<AppErrorCode, StopFlagMessageKey>> = {
  [AppErrorCode.Offline]: StopFlagMessageKey.PausedOffline,
  [AppErrorCode.UnsyncedData]: StopFlagMessageKey.PausedStillSaving,
};

/** A Session's stop leaves the Session screen for Today (and the guard takes a paused person on from there). */
export const ROUTE_AFTER_SESSION_STOP = RoutePath.Today;

export const ROUTE_WHEN_SIGNED_OUT = RoutePath.Start;
