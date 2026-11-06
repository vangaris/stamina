import type { LaunchSport } from '@stamina/domain';
import type { SelectOption } from '@stamina/ui-select';
import { LAUNCH_SPORTS, OTHER_SPORT } from '../config.ts';

/** The launch sports, then the person's own sport when the profile has one. */
export function toSportOptions(
  label: (sport: LaunchSport) => string,
  otherSportName: string | undefined,
): SelectOption[] {
  const options = LAUNCH_SPORTS.map((sport) => ({ value: sport, label: label(sport) }));
  return otherSportName === undefined
    ? options
    : [...options, { value: OTHER_SPORT, label: otherSportName }];
}
