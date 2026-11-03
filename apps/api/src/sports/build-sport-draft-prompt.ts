import {
  BodyArea,
  ENERGY_MIX_TOTAL,
  Intensity,
  MAX_KEY_MOVEMENTS,
  MAX_METS,
  MAX_RECOVERY_HOURS,
  MAX_SPORT_HIGH_LOAD_AREAS,
  MIN_METS,
  MIN_SPORT_SOURCES,
  SeasonKind,
  SportMovement,
} from '@stamina/domain';

const values = (enumeration: Record<string, string>) => Object.values(enumeration).join(', ');

/**
 * The prompt that asks for one draft Sport Profile. Built from the sport's NAME only: no user,
 * profile, Screening or health data is ever passed in, and the name is quoted as a JSON string so
 * it reads as data. The output is a draft that the founder reviews and approves by hand; the copy
 * rule below is also checked in that review (`docs/sport-profile-review.md`).
 */
export function buildSportDraftPrompt(sportName: string): string {
  return [
    `Draft a Sport Profile for the sport named ${JSON.stringify(sportName)}.`,
    'The profile is structured data that a training planner uses; answer with the requested fields only.',
    '',
    'Fields:',
    `- energyMix: aerobic, repeatedSprint and explosive, whole-number percentages that add up to exactly ${ENERGY_MIX_TOTAL}.`,
    `- keyMovements: 1 to ${MAX_KEY_MOVEMENTS} of: ${values(SportMovement)}.`,
    `- highLoadAreas: 1 to ${MAX_SPORT_HIGH_LOAD_AREAS} body areas under the most load while playing, of: ${values(BodyArea)}.`,
    `- typicalActivity: durationMinutes of a usual session and its intensity, one of: ${values(Intensity)}.`,
    `- recoveryWindowHours: lower and upper, whole hours (0 to ${MAX_RECOVERY_HOURS}) to leave after a hard session of this sport before heavy lower-body or upper-body strength training.`,
    `- season: kind, one of: ${values(SeasonKind)}, and months (numbers 1 to 12; empty for year-round).`,
    `- metsPerIntensity: easy, moderate and hard METs (${MIN_METS} to ${MAX_METS}), each no lower than the one before, taken from the Compendium of Physical Activities entry for this sport.`,
    `- sources: at least ${MIN_SPORT_SOURCES} sources you used, each with a title and an https URL that a reviewer can open, for example the Compendium of Physical Activities entry and a sport-science paper or governing-body page that supports the numbers.`,
    '',
    'Copy rule: describe the sport only. Make no injury-prevention, rehabilitation, therapy or medical claim anywhere, and give source titles that describe the source, not a health benefit.',
    'Do not guess: choose values you can support with the sources you cite.',
  ].join('\n');
}
