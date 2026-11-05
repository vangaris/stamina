import { AppErrorCode } from '@stamina/app-core';
import { ProgramRejection } from '@stamina/contracts';
import { RoutePath } from '../../enums/route-path.ts';
import { ProgramMessageKey } from './enums/program-message-key.ts';

/** At this Session length the sport-support and accessories slots are shown as one block. */
export const MERGED_BLOCK_MINUTES = 30;

/** Dates arrive as UTC calendar days, so they are shown in UTC too. */
export const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
};

/** What a refused Program shows. A referral is not here: it leaves for the Referred screen. */
export const MESSAGE_FOR_REJECTION: Record<
  Exclude<ProgramRejection, ProgramRejection.Referred>,
  ProgramMessageKey
> = {
  [ProgramRejection.NotReady]: ProgramMessageKey.NotReady,
  [ProgramRejection.NoTrainingWeek]: ProgramMessageKey.NoTrainingWeek,
  [ProgramRejection.NoExercises]: ProgramMessageKey.NoExercises,
};

/** What a request that failed shows: the message for its error code, else the generic one. */
export const LOAD_ERROR_KEYS: Partial<Record<AppErrorCode, ProgramMessageKey>> = {
  [AppErrorCode.Offline]: ProgramMessageKey.Offline,
};

export const ROUTE_AFTER_REVEAL = RoutePath.Today;
