import { Units } from '@stamina/domain';
import { IMPERIAL_LANGUAGE_TAG } from '../config.ts';

/** Imperial only for a device set to `en-US` (its first preferred language); metric for everyone else. */
export function defaultUnits(languages: readonly string[]): Units {
  return languages[0]?.toLowerCase() === IMPERIAL_LANGUAGE_TAG ? Units.Imperial : Units.Metric;
}
