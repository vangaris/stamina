import { ActivityRejection, SportKind } from '@stamina/contracts';
import { Intensity, LaunchSport } from '@stamina/domain';
import { RoutePath } from '../../enums/route-path.ts';
import { PlayedMessageKey } from './enums/played-message-key.ts';
import type { PlayedDraft, SportChoice } from './types.ts';

/** The duration stepper moves a quarter of an hour at a time. */
export const MINUTES_STEP = 15;

/** The sports the sheet offers: the launch sports (the person's own "other" sport is added after them). */
export const LAUNCH_SPORTS: readonly LaunchSport[] = Object.values(LaunchSport);

/** The effort chips, easiest first. */
export const INTENSITIES: readonly Intensity[] = Object.values(Intensity);

export const OTHER_SPORT: SportChoice = SportKind.Other;

/** Every value the sport select can hold. */
export const SPORT_CHOICES: readonly SportChoice[] = [...LAUNCH_SPORTS, OTHER_SPORT];

/** What the sheet starts with when the profile cannot be read (no signal on a first open). */
export const FALLBACK_DRAFT: PlayedDraft = {
  sport: LaunchSport.Padel,
  minutes: 60,
  intensity: Intensity.Moderate,
  hot: false,
};

/** What a refused Activity shows. */
export const MESSAGE_FOR_REJECTION: Record<ActivityRejection, PlayedMessageKey> = {
  [ActivityRejection.DateOutOfRange]: PlayedMessageKey.DateOutOfRange,
};

export const ROUTE_WHEN_SIGNED_OUT = RoutePath.Start;
