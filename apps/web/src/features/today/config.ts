import { MINUTES_IN_HOUR } from '@stamina/domain';
import { RoutePath } from '../../enums/route-path.ts';

/** The wind-down line closes the day at 22:30, as a minute of the day. */
export const WIND_DOWN_AT = 22 * MINUTES_IN_HOUR + 30;

/** A minute of the day is shown as 24-hour "22:30" in every language. */
export const TIME_FORMAT: Intl.DateTimeFormatOptions = {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'UTC',
};

export const MS_PER_MINUTE = 60_000;

export const ROUTE_WHEN_SIGNED_OUT = RoutePath.Start;
