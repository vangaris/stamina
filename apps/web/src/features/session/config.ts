import { AppErrorCode } from '@stamina/app-core';
import {
  ProgressionOutcome,
  MAX_SESSION_RPE,
  MAX_SET_RPE,
  MIN_SESSION_RPE,
  MIN_SET_RPE,
  SessionSlot,
} from '@stamina/domain';
import { RoutePath } from '../../enums/route-path.ts';
import { SessionMessageKey } from './enums/session-message-key.ts';
import { TargetMessageKey } from './enums/target-message-key.ts';

/**
 * Seconds of rest after a set, by slot. A slot without an entry (warm-up, cool-down) has no rest
 * timer.
 */
export const REST_SECONDS: Partial<Record<SessionSlot, number>> = {
  [SessionSlot.MainStrength]: 120,
  [SessionSlot.SportSupport]: 90,
  [SessionSlot.AccessoriesCore]: 60,
};

/** What the rest timer's add-time button adds. */
export const REST_ADD_SECONDS = 15;

/** How often the rest timer looks at the clock. */
export const REST_TICK_MS = 1000;

export const MS_PER_SECOND = 1000;

/** The weight stepper moves in the smallest plate jump a pair of dumbbells or a small plate allows. */
export const WEIGHT_STEP_KG = 2.5;

export const WEIGHT_FORMAT: Intl.NumberFormatOptions = { maximumFractionDigits: 1 };

export const REPS_STEP = 1;

/** Timed holds move in bigger steps. */
export const SECONDS_STEP = 5;

/** A logged set has at least one rep (or one second). */
export const MIN_REPS = 1;

/** The weight stepper starts and stops at no weight. */
export const MIN_WEIGHT_KG = 0;

/**
 * How long a tap on Done is held against a second one. The set is on the screen at once and the
 * view has moved on to the next one, so a quick second tap would log that set as well.
 */
export const LOG_TAP_GUARD_MS = 600;

/** Session minutes are adjusted in steps of five. */
export const FINISH_MINUTES_STEP = 5;
export const MIN_FINISH_MINUTES = 5;

/** The effort chips: the values a set may be rated at, and the ones the whole Session may. */
export const SET_RPE_VALUES: readonly number[] = Array.from(
  { length: MAX_SET_RPE - MIN_SET_RPE + 1 },
  (_, index) => MIN_SET_RPE + index,
);
export const SESSION_RPE_VALUES: readonly number[] = Array.from(
  { length: MAX_SESSION_RPE - MIN_SESSION_RPE + 1 },
  (_, index) => MIN_SESSION_RPE + index,
);

/** How the suggested weight reads, by how it was reached from the last Session. */
export const SUGGESTED_WEIGHT_KEYS: Record<ProgressionOutcome, TargetMessageKey> = {
  [ProgressionOutcome.Increase]: TargetMessageKey.SuggestedIncrease,
  [ProgressionOutcome.Decrease]: TargetMessageKey.SuggestedDecrease,
  [ProgressionOutcome.Hold]: TargetMessageKey.SuggestedHold,
};

/** Where a person's swaps for a Session are kept on this device (the Session's id follows). */
export const SWAP_STORAGE_PREFIX = 'stamina.session-swaps.';

/** What a Session that fails to open shows: the message for its error code, else the generic one. */
export const LOAD_ERROR_KEYS: Partial<Record<AppErrorCode, SessionMessageKey>> = {
  [AppErrorCode.Offline]: SessionMessageKey.Offline,
};

/** Where a signed-out person goes. */
export const ROUTE_WHEN_SIGNED_OUT = RoutePath.Start;
