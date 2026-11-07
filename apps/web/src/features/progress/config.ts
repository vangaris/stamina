import { AppErrorCode } from '@stamina/app-core';
import { RoutePath } from '../../enums/route-path.ts';
import { ProgressMessageKey } from './enums/progress-message-key.ts';
import { WeighInMessageKey } from './enums/weigh-in-message-key.ts';

export const ROUTE_WHEN_SIGNED_OUT = RoutePath.Start;

/** What a request that failed shows: the message for its error code, else the generic one. */
export const LOAD_ERROR_KEYS: Partial<Record<AppErrorCode, ProgressMessageKey>> = {
  [AppErrorCode.Offline]: ProgressMessageKey.Offline,
};

/** What a weigh-in that failed shows: the message for its error code, else the generic one. */
export const WEIGH_IN_ERROR_KEYS: Partial<Record<AppErrorCode, WeighInMessageKey>> = {
  [AppErrorCode.Offline]: WeighInMessageKey.Offline,
};

/** Week and weigh-in dates arrive as UTC calendar days, so they are shown in UTC too: "12 Oct". */
export const SHORT_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
};

/** A weight is typed with a point or a comma: up to three digits and two decimals. */
export const WEIGHT_PATTERN = /^\d{1,3}(?:[.,]\d{1,2})?$/;

export const WEIGHT_FRACTION_DIGITS = 2;
