import {
  BodyArea,
  Equipment,
  Goal,
  LaunchSport,
  SessionFocus,
  SportMovement,
  SESSION_LENGTHS_MINUTES,
} from '@stamina/domain';
import { Locale } from '@stamina/i18n';
import { z } from 'zod';

/**
 * One case. The candidate lists come from the real exercise library through the same domain
 * function production uses, so a case says who the person is (focus, length, Limited mode,
 * excluded areas, sport, Goal) and never goes stale when the library grows.
 */
export const evalCaseSchema = z.object({
  id: z.string().min(1),
  /** The person's language. Session picks are language-neutral today; meal ideas (ticket 18) are not. */
  locale: z.enum(Locale),
  goal: z.enum(Goal),
  focus: z.enum(SessionFocus),
  minutes: z
    .number()
    .refine((minutes) => (SESSION_LENGTHS_MINUTES as readonly number[]).includes(minutes)),
  limited: z.boolean(),
  excludedAreas: z.array(z.enum(BodyArea)),
  equipment: z.array(z.enum(Equipment)),
  sport: z.enum(LaunchSport).nullable(),
  sportMovements: z.array(z.enum(SportMovement)).nullable(),
  /** How many exercises an earlier Session of the week already used. */
  recentCount: z.number().int().min(0),
});

export const evalCasesSchema = z
  .array(evalCaseSchema)
  .min(1)
  .refine((cases) => new Set(cases.map(({ id }) => id)).size === cases.length, 'case ids repeat');
