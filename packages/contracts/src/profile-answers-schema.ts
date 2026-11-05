import {
  COUNTRY_CODES,
  Goal,
  Intensity,
  LaunchSport,
  MAX_PLAY_MINUTES,
  MIN_BIRTH_YEAR,
  MIN_PLAY_MINUTES,
  Need,
  normalizeSportName,
  OTHER_SPORT_NAME_MAX_LENGTH,
  SPORT_NORMALIZED_NAME_MAX_LENGTH,
  Units,
  validateTrainingWeek,
  Weekday,
} from '@stamina/domain';
import { Locale } from '@stamina/i18n';
import { z } from 'zod';
import { INVISIBLE_CHARACTER } from './config.ts';
import { SportKind } from './enums/sport-kind.ts';

const weekdaySchema = z.enum(Weekday);

/** A sport the person typed: visible text only, with its inner spaces collapsed to one. */
const otherSportNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(OTHER_SPORT_NAME_MAX_LENGTH)
  .refine((name) => !INVISIBLE_CHARACTER.test(name), 'no control or invisible characters')
  .refine((name) => {
    const key = normalizeSportName(name);
    return key !== '' && key.length <= SPORT_NORMALIZED_NAME_MAX_LENGTH;
  }, 'the name must contain letters or digits')
  .transform((name) => name.replace(/\s+/g, ' '));

export const sportSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal(SportKind.Launch), sport: z.enum(LaunchSport) }),
  z.object({
    kind: z.literal(SportKind.Other),
    name: otherSportNameSchema,
  }),
]);

export const trainingWeekSchema = z.object({
  sessionsPerWeek: z.number().int(),
  sessionMinutes: z.number().int(),
  availableDays: z.array(weekdaySchema).max(Object.values(Weekday).length),
});

/**
 * What a person tells Stamina in the first onboarding screens. Shape only for birth year and
 * country: whether the person may use Stamina is the domain's `checkEligibility`, so a minor or
 * a non-EEA resident still parses and is turned away by rule, not by a 400.
 */
export const profileAnswersSchema = z
  .object({
    needs: z.enum(Need),
    birthYear: z.number().int().min(MIN_BIRTH_YEAR),
    country: z.string().refine((code) => COUNTRY_CODES.includes(code)),
    sport: sportSchema,
    /** Days the user plays; empty when `playVaries`. */
    playDays: z.array(weekdaySchema),
    /** "It varies" (weather, pickup games): no fixed play days. */
    playVaries: z.boolean(),
    playMinutes: z.number().int().min(MIN_PLAY_MINUTES).max(MAX_PLAY_MINUTES),
    playIntensity: z.enum(Intensity),
    goal: z.enum(Goal),
    /** Asked unless the user only wants food. */
    trainingWeek: trainingWeekSchema.optional(),
    locale: z.enum(Locale),
    units: z.enum(Units),
  })
  .superRefine((answers, ctx) => {
    const fail = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: 'custom', path, message });

    if (new Set(answers.playDays).size !== answers.playDays.length) {
      fail(['playDays'], 'duplicate day');
    }
    if (answers.playVaries === answers.playDays.length > 0) {
      fail(['playDays'], 'pick play days or "It varies", not both and not neither');
    }
    const wantsTraining = answers.needs !== Need.Food;
    if (wantsTraining && !answers.trainingWeek) fail(['trainingWeek'], 'required for training');
    if (!wantsTraining && answers.trainingWeek) fail(['trainingWeek'], 'not asked for food only');
    if (answers.trainingWeek && validateTrainingWeek(answers.trainingWeek).length > 0) {
      fail(['trainingWeek'], 'invalid training week');
    }
  });
