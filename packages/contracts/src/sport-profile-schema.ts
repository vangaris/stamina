import {
  BodyArea,
  ENERGY_MIX_TOTAL,
  Intensity,
  LaunchSport,
  MAX_KEY_MOVEMENTS,
  MAX_METS,
  MAX_PLAY_MINUTES,
  MAX_RECOVERY_HOURS,
  MAX_SPORT_HIGH_LOAD_AREAS,
  MIN_METS,
  MIN_PLAY_MINUTES,
  MIN_SPORT_SOURCES,
  SeasonKind,
  SportMovement,
} from '@stamina/domain';
import { z } from 'zod';

const share = z.number().int().min(0).max(ENERGY_MIX_TOTAL);
const mets = z.number().min(MIN_METS).max(MAX_METS);
const hours = z.number().int().min(0).max(MAX_RECOVERY_HOURS);

const isUnique = (list: readonly unknown[]) => new Set(list).size === list.length;

/**
 * What the engine plans around for one sport. Structured values only: there is no free text to
 * carry a medical or injury-prevention claim. Wording about a profile never leaves this shape.
 */
export const sportProfileSchema = z
  .object({
    /** Shares of effort (percent) that add up to 100. */
    energyMix: z.object({ aerobic: share, repeatedSprint: share, explosive: share }),
    keyMovements: z.array(z.enum(SportMovement)).min(1).max(MAX_KEY_MOVEMENTS),
    /** Body areas under the most load; they steer Session emphasis and claim nothing about injury. */
    highLoadAreas: z.array(z.enum(BodyArea)).min(1).max(MAX_SPORT_HIGH_LOAD_AREAS),
    typicalActivity: z.object({
      durationMinutes: z.number().int().min(MIN_PLAY_MINUTES).max(MAX_PLAY_MINUTES),
      intensity: z.enum(Intensity),
    }),
    /** Hours after a hard Activity before a heavy lower- or upper-body Session. */
    recoveryWindowHours: z.object({ lower: hours, upper: hours }),
    season: z.object({
      kind: z.enum(SeasonKind),
      /** Usual months (1 to 12); empty for a year-round sport. */
      months: z.array(z.number().int().min(1).max(12)).max(12),
    }),
    /** METs of the sport at each effort level, for calorie estimates. */
    metsPerIntensity: z.object({ easy: mets, moderate: mets, hard: mets }),
  })
  .refine(
    ({ energyMix: { aerobic, repeatedSprint, explosive } }) =>
      aerobic + repeatedSprint + explosive === ENERGY_MIX_TOTAL,
    { path: ['energyMix'], message: 'the energy mix must add up to 100' },
  )
  .refine(({ season }) => (season.kind === SeasonKind.YearRound) === (season.months.length === 0), {
    path: ['season', 'months'],
    message: 'a year-round sport has no months; any other has some',
  })
  .refine(
    ({ keyMovements, highLoadAreas, season }) =>
      isUnique(keyMovements) && isUnique(highLoadAreas) && isUnique(season.months),
    { message: 'key movements, high-load areas and months must each be unique' },
  )
  .refine(({ metsPerIntensity: m }) => m.easy <= m.moderate && m.moderate <= m.hard, {
    path: ['metsPerIntensity'],
    message: 'METs must not fall as effort rises',
  });

/** A source the profile was drafted from; the reviewer opens it. */
export const sportSourceSchema = z.object({
  title: z.string().trim().min(1),
  url: z.url({ protocol: /^https$/ }),
});

export const sportSourcesSchema = z.array(sportSourceSchema).min(MIN_SPORT_SOURCES);

/** What a drafting run produces, and what a launch-sport data file holds. */
export const sportDraftSchema = z.object({
  profile: sportProfileSchema,
  sources: sportSourcesSchema,
});

/** One launch sport's data file entry: its id is the `LaunchSport` value. */
export const launchSportDataSchema = sportDraftSchema.extend({
  id: z.enum(LaunchSport),
  name: z.string().trim().min(1),
});
